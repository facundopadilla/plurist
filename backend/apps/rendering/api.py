from typing import Any

from django.http import HttpRequest, HttpResponseRedirect
from ninja import Router, Schema
from ninja.errors import HttpError
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import get_membership, require_editor_capabilities
from apps.accounts.models import Workspace
from apps.posts.models import BrandProfileVersion

from .hasher import compute_input_hash
from .models import RenderJob
from .templates_registry import get_template, list_templates

router = Router(tags=["rendering"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RenderJobIn(Schema):
    template_key: str
    brand_profile_version_id: int


class RenderJobOut(Schema):
    id: int
    template_key: str
    brand_profile_version_id: int
    input_hash: str
    status: str
    output_storage_key: str
    error_message: str
    created_at: str
    updated_at: str


class TemplateOut(Schema):
    key: str
    name: str
    description: str
    viewport_width: int
    viewport_height: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _workspace() -> Workspace:
    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _job_to_out(job: RenderJob) -> dict[str, Any]:
    return {
        "id": job.pk,
        "template_key": job.template_key,
        "brand_profile_version_id": job.brand_profile_version_id,
        "input_hash": job.input_hash,
        "status": job.status,
        "output_storage_key": job.output_storage_key,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/templates", auth=django_auth, response=list[TemplateOut])
def list_trusted_templates(request: HttpRequest):
    """List all available trusted templates."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    return list_templates()


@router.post("/render-jobs", auth=django_auth, response={201: RenderJobOut})
def create_render_job(request: HttpRequest, payload: RenderJobIn):
    """
    Create a render job (Owner/Editor only).

    If an identical job (same template + brand profile version) already completed,
    the cached result is returned immediately without queuing a new render.
    """
    require_editor_capabilities(request)
    workspace = _workspace()

    # Validate template key against the trusted registry
    try:
        get_template(payload.template_key)
    except KeyError:
        raise HttpError(400, f"Unknown template key: {payload.template_key!r}")

    # Resolve brand profile version scoped to workspace
    try:
        version = BrandProfileVersion.objects.get(
            pk=payload.brand_profile_version_id,
            workspace=workspace,
        )
    except BrandProfileVersion.DoesNotExist:
        raise HttpError(404, "Brand profile version not found")

    from apps.design_bank.brand_profile import map_profile_to_template_inputs

    input_variables = map_profile_to_template_inputs(version)
    input_hash = compute_input_hash(payload.template_key, version.pk, input_variables)

    # Cache check: return existing completed job if inputs are identical
    cached = RenderJob.objects.filter(
        input_hash=input_hash,
        status=RenderJob.Status.COMPLETED,
    ).first()
    if cached:
        return 201, _job_to_out(cached)

    job = RenderJob.objects.create(
        workspace=workspace,
        template_key=payload.template_key,
        brand_profile_version=version,
        input_variables=input_variables,
        input_hash=input_hash,
        status=RenderJob.Status.PENDING,
        created_by=request.user,
    )

    try:
        from .tasks import render_template

        render_template.delay(job.pk)
    except Exception:
        # Broker unavailable — job stays pending, can be retried later
        pass

    return 201, _job_to_out(job)


@router.get("/render-jobs/{job_id}", auth=django_auth, response=RenderJobOut)
def get_render_job(request: HttpRequest, job_id: int):
    """Poll render job status."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace()
    try:
        job = RenderJob.objects.get(pk=job_id, workspace=workspace)
    except RenderJob.DoesNotExist:
        raise HttpError(404, "Render job not found")

    return _job_to_out(job)


@router.get("/render-jobs/{job_id}/image", auth=django_auth)
def get_render_image(request: HttpRequest, job_id: int):
    """
    Get the rendered image for a completed job.
    Returns a redirect to a short-lived presigned MinIO URL (private — not public).
    """
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace()
    try:
        job = RenderJob.objects.get(pk=job_id, workspace=workspace)
    except RenderJob.DoesNotExist:
        raise HttpError(404, "Render job not found")

    if job.status != RenderJob.Status.COMPLETED:
        raise HttpError(409, "Render job is not completed yet")

    if not job.output_storage_key:
        raise HttpError(500, "Render job completed but has no output")

    from apps.design_bank.storage import generate_presigned_url

    url = generate_presigned_url(job.output_storage_key, expires_in=300)
    return HttpResponseRedirect(url)
