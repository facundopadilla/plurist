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
import logging
import re
from typing import Any, Generator

from apps.accounts.models import Workspace
from apps.generation.prompt_builder import build_design_prompt
from apps.generation.providers import registry as provider_registry
from apps.generation.providers.errors import ProviderError, classify_provider_error
from apps.workspace.models import WorkspaceAISettings

logger = logging.getLogger(__name__)

_SLIDE_START_RE = re.compile(r"<!--\s*SLIDE_START\s+(\d+)\s*-->", re.IGNORECASE)
_SLIDE_END_RE = re.compile(r"<!--\s*SLIDE_END\s*-->", re.IGNORECASE)
_HTML_DETECT_RE = re.compile(r"<(html|div|section|p|h[1-6])", re.IGNORECASE)


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _max_slide_index_in_context(current_html: str) -> int:
    """Return the highest slide index found in <!-- SLIDE N --> comments, or -1."""
    indices = [int(m) for m in re.findall(r"<!--\s*SLIDE\s+(\d+)\s*-->", current_html)]
    return max(indices) if indices else -1


def _load_workspace_settings():
    workspace_settings = None
    try:
        workspace = Workspace.objects.first()
        if workspace is not None:
            workspace_settings = WorkspaceAISettings.objects.filter(workspace=workspace).first()
    except Exception:
        logger.warning("Could not load workspace AI settings for chat stream", exc_info=True)
    return workspace_settings


def _resolve_stream_model_id(
    provider_key: str,
    model_id: str | None,
    workspace_settings,
) -> str | None:
    resolved_model_id = model_id
    if not resolved_model_id and workspace_settings is not None:
        preferred = workspace_settings.preferred_models or {}
        if isinstance(preferred, dict):
            resolved_model_id = preferred.get(provider_key) or None
    return resolved_model_id


def _resolve_provider(
    provider_key: str,
    workspace_settings,
    model_id: str | None,
):
    resolved_model_id = _resolve_stream_model_id(provider_key, model_id, workspace_settings)
    return provider_registry.get_provider(provider_key, workspace_settings, model_id=resolved_model_id)


def _get_last_user_message(messages: list[dict[str, str]]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return msg["content"]
    return ""


def _build_stream_error_payload(exc: Exception, provider_key: str) -> dict[str, Any]:
    if isinstance(exc, ProviderError):
        return {
            "message": str(exc),
            "code": exc.code,
            "category": exc.category,
            "hint": exc.hint,
            "retryable": exc.retryable,
        }

    classified = classify_provider_error(exc, provider_key)
    return {
        "message": classified.message,
        "code": classified.code,
        "category": classified.category,
        "hint": classified.hint,
        "retryable": classified.retryable,
    }


def _extract_full_stream_text(provider, prompt: str, context: dict[str, Any]) -> Generator[str, None, str]:
    full_text_parts: list[str] = []
    for token in provider.generate_stream(prompt, context):
        full_text_parts.append(token)
        yield _sse("token", {"text": token})
    return "".join(full_text_parts)


def _yield_stream_outputs(
    mode: str,
    full_text: str,
    next_slide_index: int,
) -> Generator[str, None, None]:
    if mode == "element-edit":
        element_patch = _extract_element_patch(full_text)
        if element_patch is not None:
            yield _sse("element_patch", element_patch)
            return

    if mode in {"element-edit", "build"}:
        html_blocks = _extract_html_blocks(full_text, next_slide_index)
        for block in html_blocks:
            yield _sse("html_block", block)


def stream_chat(
    messages: list[dict[str, str]],
    provider_key: str,
    project_id: int | None,
    fmt: str,
    network: str,
    model_id: str | None = None,
    mode: str = "build",
    current_html: str = "",
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
    workspace_settings = _load_workspace_settings()

    try:
        provider = _resolve_provider(provider_key, workspace_settings, model_id)
    except Exception as exc:
        yield _sse(
            "error",
            {
                "message": f"Unknown provider: {exc}",
                "code": "unknown",
                "category": "provider",
                "hint": "Check your provider configuration in Workspace Settings.",
                "retryable": False,
            },
        )
        return

    user_message = _get_last_user_message(messages)
    if not user_message:
        yield _sse(
            "error",
            {
                "message": "No user message found in conversation",
                "code": "unknown",
                "category": "content",
                "hint": "Send a message before requesting generation.",
                "retryable": False,
            },
        )
        return

    prompt = build_design_prompt(
        campaign_brief="",  # Pass empty, the history handles the actual messages
        fmt=fmt,
        project_id=project_id,
        target_network=network,
        mode=mode,
        current_html=current_html,
    )

    try:
        context = {"messages": messages, "mode": mode}
        full_text = yield from _extract_full_stream_text(provider, prompt, context)
    except Exception as exc:
        yield _sse("error", _build_stream_error_payload(exc, provider_key))
        return

    next_slide_index = _max_slide_index_in_context(current_html) + 1
    yield from _yield_stream_outputs(mode, full_text, next_slide_index)
    yield _sse("done", {})


def _extract_html_blocks(text: str, default_index: int = 0) -> list[dict[str, Any]]:
    """
    Extract slide HTML blocks from the generated text.

    Looks for <!-- SLIDE_START N --> ... <!-- SLIDE_END --> markers.
    Falls back to looking for markdown html code blocks (```html ... ```).
    Falls back to treating the entire text as a single block at
    ``default_index`` if HTML is detected but no markers found.

    ``default_index`` should be set to ``max_existing + 1`` so new slides
    created without explicit markers do not overwrite existing ones.
    """
    parts = _SLIDE_START_RE.split(text)
    if len(parts) > 1:
        return _extract_marker_blocks(parts)

    markdown_blocks = _extract_markdown_html_blocks(text, default_index)
    if markdown_blocks:
        return markdown_blocks

    return _extract_fallback_html_block(text, default_index)


def _extract_marker_blocks(parts: list[str]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    index = 1
    while index < len(parts):
        try:
            slide_index = int(parts[index])
        except (ValueError, IndexError):
            index += 2
            continue

        content = parts[index + 1] if index + 1 < len(parts) else ""
        end_match = _SLIDE_END_RE.search(content)
        if end_match:
            content = content[: end_match.start()]
        blocks.append({"slide_index": slide_index, "html": content.strip()})
        index += 2
    return blocks


def _extract_markdown_html_blocks(text: str, default_index: int) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    fenced_parts = text.split("```")
    for index in range(1, len(fenced_parts), 2):
        block = fenced_parts[index].lstrip()
        if block.lower().startswith("html"):
            block = block[4:]
        stripped_block = block.strip()
        if _HTML_DETECT_RE.search(stripped_block):
            blocks.append({"slide_index": default_index + len(blocks), "html": stripped_block})
    return blocks


def _extract_fallback_html_block(text: str, default_index: int) -> list[dict[str, Any]]:
    if _HTML_DETECT_RE.search(text):
        return [{"slide_index": default_index, "html": text.strip()}]
    return []


def _extract_element_patch(text: str) -> dict[str, Any] | None:
    """Extract a raw JSON element patch from provider output."""
    candidate = text.strip()
    fenced_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", candidate, re.IGNORECASE)
    if fenced_match:
        candidate = fenced_match.group(1).strip()

    payload = _parse_json_candidate(candidate)
    if payload is None:
        return None
    return _normalize_element_patch(payload)


def _parse_json_candidate(candidate: str) -> dict[str, Any] | None:
    try:
        payload = json.loads(candidate)
        return payload if isinstance(payload, dict) else None
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        for match in re.finditer(r"\{", candidate):
            try:
                parsed, _end = decoder.raw_decode(candidate[match.start() :])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
    return None


def _normalize_element_patch(payload: dict[str, Any]) -> dict[str, Any] | None:
    patch_type = payload.get("type")
    css_path = payload.get("cssPath")
    updated_outer_html = payload.get("updatedOuterHtml")

    if patch_type != "element_patch":
        return None
    if not isinstance(css_path, str) or not css_path.strip():
        return None
    if not isinstance(updated_outer_html, str) or not updated_outer_html.strip():
        return None

    slide_index = payload.get("slideIndex", 0)
    try:
        normalized_slide_index = int(slide_index)
    except (TypeError, ValueError):
        normalized_slide_index = 0

    return {
        "slide_index": normalized_slide_index,
        "css_path": css_path,
        "updated_outer_html": updated_outer_html,
    }
