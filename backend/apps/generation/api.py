from __future__ import annotations

import logging
from typing import Any

import httpx
from ninja import Router, Schema
from ninja.errors import HttpError
from pydantic import Field

from apps.accounts.auth import MEMBERSHIP_REQUIRED_DETAIL, get_membership, require_editor_capabilities
from apps.accounts.session_auth import session_auth as django_auth
from apps.posts.models import BrandProfileVersion, CarouselSlide, DraftPost, DraftVariant
from apps.projects.models import Project
from apps.workspace.models import WorkspaceAISettings

from .chat_api import router as chat_router
from .models import CompareRun
from .providers.registry import get_provider, list_providers
from .tasks import run_compare_task

logger = logging.getLogger(__name__)

router = Router(tags=["generation"])
router.add_router("/chat", chat_router)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CompareRunIn(Schema):
    template_key: str = ""
    campaign_brief: str
    target_network: str = ""
    providers: list[str]
    brand_profile_version_id: int | None = None
    project_id: int | None = None
    format: str = "ig_square"
    slide_count: int | None = Field(default=None, ge=1, le=20)
    width: int = Field(default=1080, ge=100, le=5120)
    height: int = Field(default=1080, ge=100, le=5120)


class VariantOut(Schema):
    id: int
    provider: str
    model_id: str
    generated_text: str
    generated_html: str
    is_selected: bool
    slide_index: int | None = None
    created_at: str


class CompareRunOut(Schema):
    id: int
    template_key: str
    campaign_brief: str
    target_network: str
    providers: list[str]
    status: str
    format: str
    slide_count: int | None = None
    width: int = 1080
    height: int = 1080
    created_at: str
    variants: list[VariantOut] = []


class SelectVariantOut(Schema):
    ok: bool
    variant_id: int


class SelectVariantIn(Schema):
    slide_index: int = 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _variant_to_out(v: DraftVariant) -> dict[str, Any]:
    return {
        "id": v.pk,
        "provider": v.provider,
        "model_id": v.model_id,
        "generated_text": v.generated_text,
        "generated_html": v.generated_html,
        "is_selected": v.is_selected,
        "slide_index": v.slide_index,
        "created_at": v.created_at.isoformat(),
    }


def _compare_run_to_out(cr: CompareRun, include_variants: bool = False) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": cr.pk,
        "template_key": cr.template_key,
        "campaign_brief": cr.campaign_brief,
        "target_network": cr.target_network,
        "providers": cr.providers,
        "status": cr.status,
        "format": cr.format or "ig_square",
        "slide_count": cr.slide_count,
        "width": cr.width,
        "height": cr.height,
        "created_at": cr.created_at.isoformat(),
        "variants": [],
    }
    if include_variants:
        draft_post = DraftPost.objects.filter(
            workspace=cr.workspace,
            title=f"compare-run-{cr.pk}",
        ).first()
        if draft_post:
            data["variants"] = [_variant_to_out(v) for v in draft_post.variants.all().order_by("slide_index", "id")]
    return data


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/compare", auth=django_auth, response={202: CompareRunOut})
def start_compare(request, payload: CompareRunIn):
    """Start a new compare run across the requested providers (Owner/Editor). Returns 202 immediately."""
    membership = require_editor_capabilities(request)

    for key in payload.providers:
        get_provider(key)

    brand_profile_version = None
    if payload.brand_profile_version_id is not None:
        try:
            brand_profile_version = BrandProfileVersion.objects.get(
                pk=payload.brand_profile_version_id,
                workspace=membership.workspace,
            )
        except BrandProfileVersion.DoesNotExist:
            raise HttpError(404, "Brand profile version not found")

    project = None
    if payload.project_id is not None:
        try:
            project = Project.objects.get(
                pk=payload.project_id,
                workspace=membership.workspace,
            )
        except Project.DoesNotExist:
            raise HttpError(404, "Project not found")

    compare_run = CompareRun.objects.create(
        workspace=membership.workspace,
        brand_profile_version=brand_profile_version,
        project=project,
        template_key=payload.template_key,
        format=payload.format,
        campaign_brief=payload.campaign_brief,
        target_network=payload.target_network,
        providers=payload.providers,
        slide_count=payload.slide_count,
        width=payload.width,
        height=payload.height,
        created_by=request.user,
    )

    run_compare_task.delay(compare_run.id)

    return 202, _compare_run_to_out(compare_run, include_variants=False)


@router.get("/compare/{compare_run_id}", auth=django_auth, response=CompareRunOut)
def get_compare(request, compare_run_id: int):
    """Retrieve a compare run with all generated variants."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    try:
        compare_run = CompareRun.objects.get(
            pk=compare_run_id,
            workspace=membership.workspace,
        )
    except CompareRun.DoesNotExist:
        raise HttpError(404, "Compare run not found")

    return _compare_run_to_out(compare_run, include_variants=True)


@router.post(
    "/compare/{compare_run_id}/select-variant/{variant_id}",
    auth=django_auth,
    response=SelectVariantOut,
)
def select_variant(request, compare_run_id: int, variant_id: int, payload: SelectVariantIn):
    """Explicitly select a variant from a compare run (Owner/Editor)."""
    membership = require_editor_capabilities(request)

    try:
        compare_run = CompareRun.objects.get(
            pk=compare_run_id,
            workspace=membership.workspace,
        )
    except CompareRun.DoesNotExist:
        raise HttpError(404, "Compare run not found")

    draft_post = DraftPost.objects.filter(
        workspace=compare_run.workspace,
        title=f"compare-run-{compare_run.pk}",
    ).first()
    if not draft_post:
        raise HttpError(404, "No variants found for this compare run")

    try:
        variant = draft_post.variants.get(pk=variant_id)
    except DraftVariant.DoesNotExist:
        raise HttpError(404, "Variant not found")

    slide_index = payload.slide_index

    # Validate that the variant belongs to the requested slide
    if variant.slide_index is not None and variant.slide_index != slide_index:
        raise HttpError(400, "slide_index does not match variant")

    # For carousel: update/create CarouselSlide for this slide_index
    # Also update legacy is_selected for backward compat (only for slide 0)
    CarouselSlide.objects.update_or_create(
        draft_post=draft_post,
        slide_index=slide_index,
        defaults={"selected_variant": variant},
    )

    # Legacy single-variant selection (backward compat for slide 0)
    if slide_index == 0:
        draft_post.variants.filter(slide_index=0).update(is_selected=False)
        variant.is_selected = True
        variant.save(update_fields=["is_selected"])
        draft_post.selected_variant = variant
        draft_post.save(update_fields=["selected_variant", "updated_at"])

    return SelectVariantOut(ok=True, variant_id=variant.pk)


@router.get("/providers", auth=django_auth, response=list[str])
def get_providers(request):
    """List all available provider keys."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)
    return list_providers()


class OllamaModelOut(Schema):
    name: str
    display_name: str


@router.get("/ollama/models", auth=django_auth, response=list[OllamaModelOut])
def get_ollama_models(request):
    """Proxy Ollama's /api/tags and return normalised model names.

    Requires an authenticated workspace member.  Reads ``ollama_base_url``
    from workspace AI settings (defaults to ``http://localhost:11434``).
    Returns an empty list when Ollama is unreachable instead of raising so
    the frontend can degrade gracefully.
    """
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    # Resolve base URL from workspace settings
    base_url = "http://localhost:11434"
    try:
        ws_settings = WorkspaceAISettings.objects.filter(workspace=membership.workspace).first()
        if ws_settings and ws_settings.ollama_base_url:
            base_url = ws_settings.ollama_base_url.rstrip("/")
    except Exception:
        logger.debug("Could not resolve Ollama base URL from workspace settings", exc_info=True)

    try:
        response = httpx.get(f"{base_url}/api/tags", timeout=5)
        response.raise_for_status()
        data = response.json()
        models = data.get("models", [])
        result = []
        for m in models:
            raw_name = m.get("name", "")
            if not raw_name:
                continue
            # Strip ":latest" suffix for cleaner display
            display = raw_name.replace(":latest", "") if raw_name.endswith(":latest") else raw_name
            result.append(OllamaModelOut(name=raw_name, display_name=display))
        return result
    except Exception:
        # Ollama not running — return empty list; frontend handles this gracefully
        return []
