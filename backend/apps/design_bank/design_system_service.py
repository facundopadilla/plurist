from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from apps.design_bank.models import DesignBankSource
from apps.design_bank.storage import download_file

logger = logging.getLogger(__name__)

DESIGN_SYSTEM_NAME = "Project Design System"
REFERENCE_BRIEF_NAME = "Project Reference Brief"
REFERENCE_BRIEF_KIND = "reference_brief"
DESIGN_SYSTEM_KIND = "design_system"

_TEXTUAL_SOURCE_TYPES = {
    DesignBankSource.SourceType.TEXT,
    DesignBankSource.SourceType.HTML,
    DesignBankSource.SourceType.MARKDOWN,
    DesignBankSource.SourceType.URL,
    DesignBankSource.SourceType.CSS,
    DesignBankSource.SourceType.UPLOAD,
}
_TEXTUAL_EXTENSIONS = {".txt", ".md", ".markdown", ".html", ".htm", ".css"}


@dataclass
class ProjectArtifactStatus:
    has_design_system: bool
    has_reference_brief: bool
    has_relevant_sources: bool
    is_outdated: bool
    relevant_source_count: int
    last_relevant_source_at: str | None
    artifact_revision: str | None
    design_system_source_id: int | None
    reference_brief_source_id: int | None
    has_manual_edits: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "has_design_system": self.has_design_system,
            "has_reference_brief": self.has_reference_brief,
            "has_relevant_sources": self.has_relevant_sources,
            "is_outdated": self.is_outdated,
            "relevant_source_count": self.relevant_source_count,
            "last_relevant_source_at": self.last_relevant_source_at,
            "artifact_revision": self.artifact_revision,
            "design_system_source_id": self.design_system_source_id,
            "reference_brief_source_id": self.reference_brief_source_id,
            "has_manual_edits": self.has_manual_edits,
        }


def get_project_design_system_source(project_id: int) -> DesignBankSource | None:
    return _resolve_managed_artifact_source(
        project_id=project_id,
        source_type=DesignBankSource.SourceType.DESIGN_SYSTEM,
        artifact_kind=DESIGN_SYSTEM_KIND,
        fallback_name=DESIGN_SYSTEM_NAME,
    )


def get_project_reference_brief_source(project_id: int) -> DesignBankSource | None:
    return _resolve_managed_artifact_source(
        project_id=project_id,
        source_type=DesignBankSource.SourceType.MARKDOWN,
        artifact_kind=REFERENCE_BRIEF_KIND,
        fallback_name=REFERENCE_BRIEF_NAME,
    )


def get_project_design_system_status(project_id: int) -> ProjectArtifactStatus:
    design_system = get_project_design_system_source(project_id)
    reference_brief = get_project_reference_brief_source(project_id)
    relevant_sources = list(_iter_relevant_sources(project_id))
    latest_relevant = max((source.updated_at for source in relevant_sources), default=None)

    artifact_revision = _extract_artifact_revision(design_system, reference_brief)
    latest_relevant_iso = latest_relevant.isoformat() if latest_relevant else None
    artifacts_complete = design_system is not None and reference_brief is not None

    return ProjectArtifactStatus(
        has_design_system=design_system is not None,
        has_reference_brief=reference_brief is not None,
        has_relevant_sources=bool(relevant_sources),
        is_outdated=(not artifacts_complete)
        or (bool(latest_relevant_iso) and artifact_revision != latest_relevant_iso),
        relevant_source_count=len(relevant_sources),
        last_relevant_source_at=latest_relevant_iso,
        artifact_revision=artifact_revision,
        design_system_source_id=design_system.pk if design_system else None,
        reference_brief_source_id=reference_brief.pk if reference_brief else None,
        has_manual_edits=_was_manually_edited(design_system) or _was_manually_edited(reference_brief),
    )


def build_compacted_project_context(project_id: int) -> str:
    design_system = get_project_design_system_source(project_id)
    reference_brief = get_project_reference_brief_source(project_id)

    sections: list[str] = []
    if design_system:
        content = _artifact_content(design_system)
        if content:
            sections.append(f"PROJECT DESIGN SYSTEM:\n{content}")

    if reference_brief:
        content = _artifact_content(reference_brief)
        if content:
            sections.append(f"PROJECT REFERENCE BRIEF:\n{content}")

    return "\n\n".join(section for section in sections if section.strip())


def sync_project_design_system(
    *,
    project_id: int,
    workspace,
    user,
    provider_key: str,
    model_id: str | None = None,
    guidance: str = "",
) -> dict[str, Any]:
    relevant_sources = list(_iter_relevant_sources(project_id))
    latest_relevant = max((source.updated_at for source in relevant_sources), default=None)
    latest_revision = latest_relevant.isoformat() if latest_relevant else None
    source_ids = [source.pk for source in relevant_sources]

    source_bundle = _build_source_bundle(relevant_sources)
    if not source_bundle.strip() and not guidance.strip():
        raise ValueError(
            "Add textual Design Bank sources or provide guidance before creating the project design system.",
        )
    if not source_bundle.strip():
        source_bundle = f"## Source: Manual guidance\nType: text\n{guidance.strip()}"

    payload = _synthesize_artifacts(
        source_bundle=source_bundle,
        guidance=guidance,
        provider_key=provider_key,
        model_id=model_id,
    )

    metadata = {
        "artifact_revision": latest_revision,
        "derived_from_source_ids": source_ids,
        "generated_with": {
            "provider": provider_key,
            "model_id": model_id,
        },
        "summary": payload.get("summary", "").strip(),
    }

    design_system = _upsert_managed_artifact(
        workspace=workspace,
        user=user,
        project_id=project_id,
        source_type=DesignBankSource.SourceType.DESIGN_SYSTEM,
        artifact_kind=DESIGN_SYSTEM_KIND,
        fallback_name=DESIGN_SYSTEM_NAME,
        display_name=DESIGN_SYSTEM_NAME,
        content=payload["design_system_markdown"].strip(),
        metadata=metadata,
    )

    reference_brief = _upsert_managed_artifact(
        workspace=workspace,
        user=user,
        project_id=project_id,
        source_type=DesignBankSource.SourceType.MARKDOWN,
        artifact_kind=REFERENCE_BRIEF_KIND,
        fallback_name=REFERENCE_BRIEF_NAME,
        display_name=REFERENCE_BRIEF_NAME,
        content=payload["reference_brief_markdown"].strip(),
        metadata=metadata,
    )

    return {
        "design_system": design_system,
        "reference_brief": reference_brief,
        "status": get_project_design_system_status(project_id),
    }


def _extract_artifact_revision(
    design_system: DesignBankSource | None,
    reference_brief: DesignBankSource | None,
) -> str | None:
    candidates = [
        _resource_string(design_system, "artifact_revision"),
        _resource_string(reference_brief, "artifact_revision"),
    ]
    return next((candidate for candidate in candidates if candidate), None)


def _resolve_managed_artifact_source(
    *,
    project_id: int,
    source_type: str,
    artifact_kind: str,
    fallback_name: str,
) -> DesignBankSource | None:
    managed = DesignBankSource.objects.filter(
        project_id=project_id,
        source_type=source_type,
        status=DesignBankSource.Status.READY,
    ).order_by("-updated_at")

    direct_match = next(
        (source for source in managed if (source.resource_data or {}).get("artifact_kind") == artifact_kind),
        None,
    )
    if direct_match is not None:
        return direct_match

    return next(
        (source for source in managed if source.name == fallback_name and _looks_like_legacy_managed_artifact(source)),
        None,
    )


def _looks_like_legacy_managed_artifact(source: DesignBankSource) -> bool:
    rd = source.resource_data or {}
    legacy_keys = {"artifact_revision", "derived_from_source_ids", "generated_with", "managed_by"}
    return any(key in rd for key in legacy_keys)


def _upsert_managed_artifact(
    *,
    workspace,
    user,
    project_id: int,
    source_type: str,
    artifact_kind: str,
    fallback_name: str,
    display_name: str,
    content: str,
    metadata: dict[str, Any],
) -> DesignBankSource:
    source = _resolve_managed_artifact_source(
        project_id=project_id,
        source_type=source_type,
        artifact_kind=artifact_kind,
        fallback_name=fallback_name,
    )

    resource_data = {
        **metadata,
        "artifact_kind": artifact_kind,
        "managed_by": "design_system_sync",
        "content": content,
        "edited_after_generation": False,
    }

    if source is None:
        return DesignBankSource.objects.create(
            workspace=workspace,
            project_id=project_id,
            source_type=source_type,
            name=display_name,
            status=DesignBankSource.Status.READY,
            resource_data=resource_data,
            created_by=user,
            error_message="",
        )

    source.name = display_name
    source.status = DesignBankSource.Status.READY
    source.resource_data = resource_data
    source.created_by = user
    source.error_message = ""
    source.save(
        update_fields=[
            "name",
            "status",
            "resource_data",
            "created_by",
            "error_message",
            "updated_at",
        ]
    )
    return source


def _was_manually_edited(source: DesignBankSource | None) -> bool:
    if source is None:
        return False
    return bool((source.resource_data or {}).get("edited_after_generation"))


def _resource_string(source: DesignBankSource | None, key: str) -> str | None:
    if source is None:
        return None
    value = (source.resource_data or {}).get(key)
    return value if isinstance(value, str) and value.strip() else None


def _artifact_content(source: DesignBankSource) -> str:
    value = (source.resource_data or {}).get("content")
    return value.strip() if isinstance(value, str) else ""


def _iter_relevant_sources(project_id: int):
    sources = DesignBankSource.objects.filter(
        project_id=project_id,
        status=DesignBankSource.Status.READY,
    ).exclude(source_type=DesignBankSource.SourceType.DESIGN_SYSTEM)

    for source in sources.order_by("updated_at", "pk"):
        if _is_reference_brief(source):
            continue
        if not _is_relevant_source(source):
            continue
        yield source


def _is_reference_brief(source: DesignBankSource) -> bool:
    return (source.source_type == DesignBankSource.SourceType.MARKDOWN and source.name == REFERENCE_BRIEF_NAME) or (
        source.resource_data or {}
    ).get("artifact_kind") == REFERENCE_BRIEF_KIND


def _is_relevant_source(source: DesignBankSource) -> bool:
    if source.source_type not in _TEXTUAL_SOURCE_TYPES:
        return False
    return bool(_extract_source_text(source).strip())


def _build_source_bundle(sources: list[DesignBankSource]) -> str:
    sections: list[str] = []

    for source in sources:
        content = _extract_source_text(source).strip()
        if not content:
            continue

        label = source.name or source.original_filename or source.url or f"Source #{source.pk}"
        sections.append(
            "\n".join(
                [
                    f"## Source: {label}",
                    f"Type: {source.source_type}",
                    content,
                ]
            )
        )

    return "\n\n".join(sections)


def _extract_source_text(source: DesignBankSource) -> str:
    rd = source.resource_data or {}
    ed = source.extracted_data or {}

    if source.source_type == DesignBankSource.SourceType.TEXT:
        content = rd.get("content")
        return content if isinstance(content, str) else ""

    snippet = ed.get("text_snippet")
    if isinstance(snippet, str) and snippet.strip():
        return snippet[:12000]

    if source.storage_key and _storage_content_is_textual(source):
        try:
            data = download_file(source.storage_key)
            return data.decode("utf-8", errors="replace")[:12000]
        except Exception as exc:
            logger.warning(
                "Could not load textual storage for source %s: %s",
                source.pk,
                exc,
                exc_info=True,
            )
            return ""

    return ""


def _storage_content_is_textual(source: DesignBankSource) -> bool:
    filename = source.original_filename or source.name or ""
    suffix = Path(filename).suffix.lower()
    if suffix in _TEXTUAL_EXTENSIONS:
        return True
    return source.source_type in {
        DesignBankSource.SourceType.HTML,
        DesignBankSource.SourceType.MARKDOWN,
        DesignBankSource.SourceType.CSS,
    }


def _synthesize_artifacts(
    *,
    source_bundle: str,
    guidance: str,
    provider_key: str,
    model_id: str | None,
) -> dict[str, str]:
    ai_payload = _try_provider_synthesis(
        source_bundle=source_bundle,
        guidance=guidance,
        provider_key=provider_key,
        model_id=model_id,
    )
    if ai_payload is not None:
        return ai_payload
    return _heuristic_synthesis(source_bundle, guidance)


def _try_provider_synthesis(
    *,
    source_bundle: str,
    guidance: str,
    provider_key: str,
    model_id: str | None,
) -> dict[str, str] | None:
    try:
        from apps.accounts.models import Workspace
        from apps.generation.providers.registry import get_provider
        from apps.workspace.models import WorkspaceAISettings

        workspace = Workspace.objects.first()
        workspace_settings = None
        if workspace is not None:
            workspace_settings = WorkspaceAISettings.objects.filter(workspace=workspace).first()

        provider = get_provider(provider_key, workspace_settings, model_id=model_id)
        prompt = _artifact_synthesis_prompt(guidance)
        result = provider.generate(
            prompt,
            {
                "messages": [{"role": "user", "content": source_bundle}],
                "mode": "plan",
            },
        )
        if not result.success:
            return None
        if result.generated_text.startswith("[") and "-mock]" in result.generated_text:
            return None
        return _extract_artifact_payload(result.generated_text)
    except Exception as exc:
        logger.warning("Provider synthesis failed: %s", exc, exc_info=True)
        return None


def _artifact_synthesis_prompt(guidance: str) -> str:
    extra_guidance = guidance.strip()
    if extra_guidance:
        extra_guidance = f"\n\nADDITIONAL USER GUIDANCE:\n{extra_guidance}"

    return f"""You are a brand systems editor.
Read the provided project sources and compress them into two compact Markdown artifacts:
1. a design system focused on visual rules reusable for slide generation
2. a reference brief focused on voice, messaging, and business context

Return ONLY raw JSON with this exact shape:
{{
  "design_system_markdown": "...",
  "reference_brief_markdown": "...",
  "summary": "short one-line summary"
}}

Rules:
- Write concise but actionable Markdown.
- Do not quote long source passages unless necessary.
- Prefer reusable rules over source recap.
- Design system should include sections for overview, color/tone cues,
  typography/layout guidance, composition rules, and do/don't guidance.
- Reference brief should include sections for audience, brand voice,
  key messages, content priorities, and constraints.
- If the sources are incomplete, state assumptions briefly instead of inventing specifics.
{extra_guidance}
"""


def _parse_json_object_from_text(candidate: str) -> dict[str, Any] | None:
    payload: dict[str, Any] | None = None
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            payload = parsed
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        for match in re.finditer(r"\{", candidate):
            try:
                parsed, _end = decoder.raw_decode(candidate[match.start() :])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                payload = parsed
                break
    return payload


def _validate_artifact_payload(payload: dict[str, Any]) -> dict[str, str] | None:
    design_system = payload.get("design_system_markdown")
    reference_brief = payload.get("reference_brief_markdown")
    summary = payload.get("summary", "")

    if not isinstance(design_system, str) or not design_system.strip():
        return None
    if not isinstance(reference_brief, str) or not reference_brief.strip():
        return None
    if not isinstance(summary, str):
        summary = ""

    return {
        "design_system_markdown": design_system.strip(),
        "reference_brief_markdown": reference_brief.strip(),
        "summary": summary.strip(),
    }


def _extract_artifact_payload(text: str) -> dict[str, str] | None:
    candidate = text.strip()
    fenced_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", candidate, re.IGNORECASE)
    if fenced_match:
        candidate = fenced_match.group(1).strip()

    payload = _parse_json_object_from_text(candidate)
    if payload is None:
        return None

    return _validate_artifact_payload(payload)


def _heuristic_synthesis(source_bundle: str, guidance: str) -> dict[str, str]:
    lines = [line.strip() for line in source_bundle.splitlines() if line.strip()]
    source_headers = [line.removeprefix("## Source: ") for line in lines if line.startswith("## Source: ")]
    excerpts = [line for line in lines if not line.startswith("## Source:") and not line.startswith("Type: ")]
    excerpt_preview = excerpts[:8]

    design_system_parts = [
        "# Project Design System",
        "",
        "## Overview",
        f"This system was synthesized from {max(len(source_headers), 1)} Design Bank source(s).",
    ]
    if guidance.strip():
        design_system_parts.extend(["", "## Requested Focus", guidance.strip()])
    if source_headers:
        design_system_parts.extend(["", "## Source Backbone"] + [f"- {header}" for header in source_headers[:10]])
    design_system_parts.extend(
        [
            "",
            "## Visual Rules",
            "- Reuse a consistent visual language across slides instead of reinventing each composition.",
            "- Favor layout, color, and typography cues that repeat across the source material.",
            "- Preserve high-contrast, presentation-ready structure suitable for social slides.",
            "",
            "## Composition Guidance",
            "- Keep each slide focused on one primary message.",
            "- Reuse spacing, hierarchy, and component treatments across related slides.",
            "- Treat uploaded references as system hints, not one-off decorations.",
        ]
    )
    if excerpt_preview:
        design_system_parts.extend(["", "## Source Signals"] + [f"- {excerpt[:180]}" for excerpt in excerpt_preview])

    reference_brief_parts = [
        "# Project Reference Brief",
        "",
        "## Context",
        "This brief condenses the textual and structural project references currently available in the Design Bank.",
    ]
    if guidance.strip():
        reference_brief_parts.extend(["", "## Requested Focus", guidance.strip()])
    reference_brief_parts.extend(
        [
            "",
            "## Key Messages",
        ]
    )
    if excerpt_preview:
        reference_brief_parts.extend([f"- {excerpt[:220]}" for excerpt in excerpt_preview])
    else:
        reference_brief_parts.append("- Add text, markdown, HTML, CSS, or URL references to deepen the brief.")
    reference_brief_parts.extend(
        [
            "",
            "## Usage Notes",
            "- Use this brief as reusable strategic context for future slide generation.",
            "- Refresh the brief whenever new Design Bank inputs materially change the project direction.",
        ]
    )

    return {
        "design_system_markdown": "\n".join(design_system_parts).strip(),
        "reference_brief_markdown": "\n".join(reference_brief_parts).strip(),
        "summary": f"Synthesized {max(len(source_headers), 1)} project source(s) into compact reusable context.",
    }
