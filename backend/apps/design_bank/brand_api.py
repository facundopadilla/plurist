from typing import Any

from ninja import Router, Schema
from ninja.errors import HttpError
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import get_membership, require_editor_capabilities
from apps.accounts.models import Workspace
from apps.posts.models import BrandProfileVersion

from .brand_profile import (
    create_brand_profile_version,
    get_active_version,
    map_profile_to_template_inputs,
    validate_profile_data,
)

router = Router(tags=["brand_profile"])


class BrandProfileIn(Schema):
    brand_name: str = ""
    voice_notes: str = ""
    logo_asset_keys: list[str] = []
    icon_asset_keys: list[str] = []
    primary_color: str = ""
    secondary_color: str = ""
    neutral_color: str = ""
    accent_color: str = ""
    approved_fonts: list[str] = []
    slogans: list[str] = []
    imagery_references: list[str] = []
    source_ids: list[int] = []


class BrandProfileOut(Schema):
    id: int
    version: int
    profile_data: dict
    created_at: str
    created_by_email: str | None = None


class TemplateInputsOut(Schema):
    brand_name: str
    voice_notes: str
    logo_asset_keys: list
    icon_asset_keys: list
    colors: dict
    fonts: list
    slogans: list
    imagery_references: list
    version_id: int
    version_number: int


def _workspace():
    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _version_to_out(v: BrandProfileVersion) -> dict[str, Any]:
    return {
        "id": v.pk,
        "version": v.version,
        "profile_data": v.profile_data,
        "created_at": v.created_at.isoformat(),
        "created_by_email": v.created_by.email if v.created_by else None,
    }


@router.get("/versions", auth=django_auth, response=list[BrandProfileOut])
def list_versions(request):
    """List all brand profile versions for the workspace."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    versions = BrandProfileVersion.objects.filter(workspace=workspace).order_by("-version")
    return [_version_to_out(v) for v in versions.select_related("created_by")]


@router.get("/versions/active", auth=django_auth, response=BrandProfileOut)
def active_version(request):
    """Get the latest active brand profile version."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    version = get_active_version(workspace)
    if not version:
        raise HttpError(404, "No brand profile version exists yet")
    return _version_to_out(version)


@router.get("/versions/{version_id}", auth=django_auth, response=BrandProfileOut)
def get_version(request, version_id: int):
    """Get a specific brand profile version."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    try:
        version = BrandProfileVersion.objects.select_related("created_by").get(
            pk=version_id, workspace=workspace
        )
    except BrandProfileVersion.DoesNotExist:
        raise HttpError(404, "Version not found")
    return _version_to_out(version)


@router.post("/versions", auth=django_auth, response={201: BrandProfileOut})
def create_version(request, payload: BrandProfileIn):
    """Create a new brand profile version (Owner/Editor only).
    This is the curation step: user explicitly promotes curated data."""
    require_editor_capabilities(request)
    workspace = _workspace()

    profile_data = payload.dict(exclude={"source_ids"})
    # Remove empty strings to keep profile_data clean
    profile_data = {k: v for k, v in profile_data.items() if v != "" and v != []}

    version = create_brand_profile_version(
        workspace=workspace,
        profile_data=profile_data,
        created_by=request.user,
        source_ids=payload.source_ids or None,
    )
    return 201, _version_to_out(version)


@router.get(
    "/versions/{version_id}/template-inputs",
    auth=django_auth,
    response=TemplateInputsOut,
)
def get_template_inputs(request, version_id: int):
    """Get the trusted template inputs mapped from a brand profile version."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    try:
        version = BrandProfileVersion.objects.get(pk=version_id, workspace=workspace)
    except BrandProfileVersion.DoesNotExist:
        raise HttpError(404, "Version not found")
    return map_profile_to_template_inputs(version)
