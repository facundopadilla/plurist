"""
Chat service for Canvas Compose.

Takes a conversation history + Design Bank context, calls a provider's
generate_stream(), and yields SSE-formatted events:
  - token        {"text": "..."}
  - html_block   {"slide_index": N, "html": "..."}
  - done         {}
  - error        {"message": "..."}

Parses SLIDE_START/SLIDE_END markers emitted by the model to extract
per-slide HTML blocks. Falls back to slide_index=0 if no markers but
HTML content is detected.
"""

from __future__ import annotations

import json
import re
from typing import Any, Generator

_SLIDE_START_RE = re.compile(r"<!--\s*SLIDE_START\s+(\d+)\s*-->", re.IGNORECASE)
_SLIDE_END_RE = re.compile(r"<!--\s*SLIDE_END\s*-->", re.IGNORECASE)
_HTML_DETECT_RE = re.compile(r"<(html|div|section|p|h[1-6])", re.IGNORECASE)


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def stream_chat(
    messages: list[dict[str, str]],
    provider_key: str,
    project_id: int | None,
    fmt: str,
    network: str,
    model_id: str | None = None,
    mode: str = "build",
) -> Generator[str, None, None]:
    """
    Stream SSE events for a chat turn.

    Args:
        messages: list of {"role": "user"|"assistant", "content": "..."} dicts
        provider_key: provider registry key (e.g. "openai", "anthropic")
        project_id: optional project for Design Bank context
        fmt: post format (e.g. "ig_square")
        network: target social network hint
        model_id: optional model override for the request; if None, falls back
                  to workspace preferred_models or provider default
        mode: "build" (default HTML generation) or "plan" (markdown strategy/copy, no HTML)

    Yields:
        SSE-formatted strings.
    """
    from apps.generation.prompt_builder import build_design_prompt
    from apps.generation.providers.registry import get_provider

    # Resolve workspace AI settings for key lookup (workspace is a singleton)
    workspace_settings = None
    try:
        from apps.accounts.models import Workspace
        from apps.workspace.models import WorkspaceAISettings

        workspace = Workspace.objects.first()
        if workspace is not None:
            workspace_settings = WorkspaceAISettings.objects.filter(workspace=workspace).first()
    except Exception:
        pass  # If DB is unavailable fall back to env vars silently

    # Resolve model_id: request-level > workspace preferred_models > provider default
    resolved_model_id: str | None = model_id
    if not resolved_model_id and workspace_settings is not None:
        preferred = workspace_settings.preferred_models or {}
        if isinstance(preferred, dict):
            resolved_model_id = preferred.get(provider_key) or None

    try:
        provider = get_provider(provider_key, workspace_settings, model_id=resolved_model_id)
    except Exception as exc:
        yield _sse("error", {"message": f"Unknown provider: {exc}"})
        return

    # Build context prompt from the last user message + design bank assets
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg["content"]
            break

    if not user_message:
        yield _sse("error", {"message": "No user message found in conversation"})
        return

    prompt = build_design_prompt(
        campaign_brief="",  # Pass empty, the history handles the actual messages
        fmt=fmt,
        project_id=project_id,
        target_network=network,
        mode=mode,
    )

    # Accumulate the full response to parse HTML blocks at the end
    full_text_parts: list[str] = []

    try:
        # Pass full message history in context so providers can use it
        context = {"messages": messages, "mode": mode}
        for token in provider.generate_stream(prompt, context):
            full_text_parts.append(token)
            yield _sse("token", {"text": token})
    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
        return

    full_text = "".join(full_text_parts)

    # In "plan" mode, we strictly do NOT parse or yield HTML blocks.
    if mode == "build":
        # Parse slide blocks from accumulated text
        html_blocks = _extract_html_blocks(full_text)
        for block in html_blocks:
            yield _sse("html_block", block)

    yield _sse("done", {})


def _extract_html_blocks(text: str) -> list[dict[str, Any]]:
    """
    Extract slide HTML blocks from the generated text.

    Looks for <!-- SLIDE_START N --> ... <!-- SLIDE_END --> markers.
    Falls back to treating the entire text as slide_index=0 if HTML is
    detected but no markers found.
    """
    blocks: list[dict[str, Any]] = []

    # Try to find SLIDE_START/SLIDE_END markers
    parts = _SLIDE_START_RE.split(text)
    # parts: [pre, slide_index_str, content_after_start, slide_index_str, ...]
    # If no markers, parts = [text]
    if len(parts) > 1:
        # Odd indices are slide index strings, even indices (>0) are content
        i = 1
        while i < len(parts):
            try:
                slide_index = int(parts[i])
            except (ValueError, IndexError):
                i += 2
                continue

            content = parts[i + 1] if i + 1 < len(parts) else ""
            # Strip everything after SLIDE_END
            end_match = _SLIDE_END_RE.search(content)
            if end_match:
                content = content[: end_match.start()]
            blocks.append({"slide_index": slide_index, "html": content.strip()})
            i += 2
        return blocks

    # No markers — check if HTML content detected, treat as slide 0
    if _HTML_DETECT_RE.search(text):
        blocks.append({"slide_index": 0, "html": text.strip()})

    return blocks
