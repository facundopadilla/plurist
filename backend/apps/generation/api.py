from __future__ import annotations

from typing import Any

from ninja import Router, Schema
from ninja.errors import HttpError
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import get_membership, require_editor_capabilities
from apps.posts.models import BrandProfileVersion, DraftVariant

from .models import CompareRun
from .providers.registry import get_provider, list_providers
from .services import run_compare

router = Router(tags=["generation"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CompareRunIn(Schema):
    template_key: str
    campaign_brief: str
    target_network: str = ""
    providers: list[str]
    brand_profile_version_id: int | None = None


class VariantOut(Schema):
    id: int
    provider: str
    model_id: str
    generated_text: str
    is_selected: bool
    created_at: str


class CompareRunOut(Schema):
    id: int
    template_key: str
    campaign_brief: str
    target_network: str
    providers: list[str]
    status: str
    created_at: str
    variants: list[VariantOut] = []


class SelectVariantOut(Schema):
    ok: bool
    variant_id: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _variant_to_out(v: DraftVariant) -> dict[str, Any]:
    return {
        "id": v.pk,
        "provider": v.provider,
        "model_id": v.model_id,
        "generated_text": v.generated_text,
        "is_selected": v.is_selected,
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
        "created_at": cr.created_at.isoformat(),
        "variants": [],
    }
    if include_variants:
        # Variants are stored on the DraftPost anchored to this run.
        from apps.posts.models import DraftPost

        draft_post = DraftPost.objects.filter(
            workspace=cr.workspace,
            title=f"compare-run-{cr.pk}",
        ).first()
        if draft_post:
            data["variants"] = [
                _variant_to_out(v)
                for v in draft_post.variants.all().order_by("id")
            ]
    return data


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/compare", auth=django_auth, response={201: CompareRunOut})
def start_compare(request, payload: CompareRunIn):
    """Start a new compare run across the requested providers (Owner/Editor)."""
    membership = require_editor_capabilities(request)

    # Validate all provider keys upfront — get_provider raises 422 for unknowns.
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

    compare_run = CompareRun.objects.create(
        workspace=membership.workspace,
        brand_profile_version=brand_profile_version,
        template_key=payload.template_key,
        campaign_brief=payload.campaign_brief,
        target_network=payload.target_network,
        providers=payload.providers,
        created_by=request.user,
    )

    run_compare(compare_run)

    return 201, _compare_run_to_out(compare_run, include_variants=True)


@router.get("/compare/{compare_run_id}", auth=django_auth, response=CompareRunOut)
def get_compare(request, compare_run_id: int):
    """Retrieve a compare run with all generated variants."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

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
def select_variant(request, compare_run_id: int, variant_id: int):
    """Explicitly select a variant from a compare run (Owner/Editor)."""
    membership = require_editor_capabilities(request)

    try:
        compare_run = CompareRun.objects.get(
            pk=compare_run_id,
            workspace=membership.workspace,
        )
    except CompareRun.DoesNotExist:
        raise HttpError(404, "Compare run not found")

    from apps.posts.models import DraftPost

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

    # Deselect all others, then select the chosen one.
    draft_post.variants.all().update(is_selected=False)
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
        raise HttpError(403, "Membership required")
    return list_providers()
