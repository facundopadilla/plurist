import uuid
from typing import Any

from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from ninja import Query, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.accounts.auth import MEMBERSHIP_REQUIRED_DETAIL, get_membership, require_editor_capabilities
from apps.accounts.models import Workspace
from apps.accounts.session_auth import session_auth as django_auth
from apps.posts.models import DraftPost

from .models import RenderJob
from .templates_registry import list_templates

router = Router(tags=["rendering"])
RENDER_JOB_NOT_FOUND = "Render job not found"


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RenderJobIn(Schema):
    template_key: str
    brand_profile_version_id: int


class RenderFromHtmlIn(Schema):
    html_content: str
    format: str = "1:1"
    project_id: int | None = None


class RenderJobOut(Schema):
    id: int
    template_key: str
    brand_profile_version_id: int | None = None
    format: str
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


class UploadBlobOut(Schema):
    storage_key: str
    draft_post_id: int | None = None
    content_type: str


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
        "format": job.format or "1:1",
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
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)
    return list_templates()


@router.post("/upload-blob", auth=django_auth, response={201: UploadBlobOut})
def upload_render_blob(
    request: HttpRequest,
    file: UploadedFile,
    draft_post_id: int | None = None,
):
    membership = require_editor_capabilities(request)
    if draft_post_id is None:
        draft_post_raw = request.POST.get("draft_post_id")
        if draft_post_raw:
            try:
                draft_post_id = int(draft_post_raw)
            except ValueError as exc:
                raise HttpError(400, "draft_post_id must be an integer") from exc

    if not (file.content_type or "").startswith("image/"):
        raise HttpError(400, "Only image uploads are supported")

    storage_key = f"renders/{uuid.uuid4().hex}.png"

    try:
        from apps.design_bank.storage import upload_file

        upload_file(file.file, storage_key, file.content_type or "image/png")
    except Exception as exc:
        raise HttpError(500, f"Upload failed: {exc}")

    if draft_post_id is not None:
        post = DraftPost.objects.filter(
            pk=draft_post_id,
            workspace=membership.workspace,
        ).first()
        if not post:
            raise HttpError(404, "Post not found")
        post.render_asset_key = storage_key
        post.save(update_fields=["render_asset_key", "updated_at"])

    return 201, UploadBlobOut(
        storage_key=storage_key,
        draft_post_id=draft_post_id,
        content_type=file.content_type or "image/png",
    )


@router.post("/render-jobs", auth=django_auth, response={201: RenderJobOut})
def create_render_job(request: HttpRequest, payload: RenderJobIn):
    """
    Create a render job (Owner/Editor only).

    If an identical job (same template + brand profile version) already completed,
    the cached result is returned immediately without queuing a new render.
    """
    raise HttpError(
        410,
        ("Server-side Playwright rendering was removed. Use the client-side canvas export flow."),
    )


@router.get("/render-jobs/{job_id}", auth=django_auth, response=RenderJobOut)
def get_render_job(request: HttpRequest, job_id: int):
    """Poll render job status."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    workspace = _workspace()
    try:
        job = RenderJob.objects.get(pk=job_id, workspace=workspace)
    except RenderJob.DoesNotExist:
        raise HttpError(404, RENDER_JOB_NOT_FOUND)

    return _job_to_out(job)


@router.get("/render-jobs/{job_id}/image", auth=django_auth)
def get_render_image(request: HttpRequest, job_id: int):
    """
    Get the rendered image for a completed job.
    Returns a redirect to a short-lived presigned MinIO URL (private — not public).
    """
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    workspace = _workspace()
    try:
        job = RenderJob.objects.get(pk=job_id, workspace=workspace)
    except RenderJob.DoesNotExist:
        raise HttpError(404, RENDER_JOB_NOT_FOUND)

    if job.status != RenderJob.Status.COMPLETED:
        raise HttpError(409, "Render job is not completed yet")

    if not job.output_storage_key:
        raise HttpError(500, "Render job completed but has no output")

    from apps.design_bank.storage import generate_presigned_url

    url = generate_presigned_url(job.output_storage_key, expires_in=300)
    return HttpResponseRedirect(url)


@router.post("/render-jobs/from-html", auth=django_auth, response={201: RenderJobOut})
def create_render_job_from_html(request: HttpRequest, payload: RenderFromHtmlIn):
    """
    Create a render job from raw HTML/CSS (Owner/Editor only).

    The HTML is sanitized before rendering. Supports multi-format viewports.
    Cached by SHA-256 of sanitized HTML + format.
    """
    raise HttpError(
        410,
        ("Server-side Playwright rendering was removed. Use the client-side canvas export flow."),
    )


@router.get("/render-jobs/{job_id}/export", auth=django_auth)
def export_render_job(
    request: HttpRequest,
    job_id: int,
    fmt: str = Query(default="png"),
    quality: int = Query(default=90),
):
    """
    Export a completed render job as PNG, JPG, WebP, or PDF.
    Downloads the PNG from MinIO, converts it, and streams the result.
    """
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    workspace = _workspace()
    try:
        job = RenderJob.objects.get(pk=job_id, workspace=workspace)
    except RenderJob.DoesNotExist:
        raise HttpError(404, RENDER_JOB_NOT_FOUND)

    if job.status != RenderJob.Status.COMPLETED:
        raise HttpError(409, "Render job is not completed yet")

    if not job.output_storage_key:
        raise HttpError(500, "Render job completed but has no output")

    from .export import SUPPORTED_FORMATS, export_render, get_png_from_storage

    fmt_lower = fmt.lower()
    if fmt_lower not in SUPPORTED_FORMATS:
        supported = ", ".join(sorted(SUPPORTED_FORMATS))
        raise HttpError(400, f"Unsupported format: {fmt!r}. Choose from: {supported}")

    try:
        png_bytes = get_png_from_storage(job.output_storage_key)
        output_bytes, content_type = export_render(
            png_bytes,
            fmt_lower,
            quality=quality,
        )
    except Exception as exc:
        raise HttpError(500, f"Export failed: {exc}")

    ext = "jpg" if fmt_lower == "jpeg" else fmt_lower
    filename = f"render-{job.pk}.{ext}"

    response = HttpResponse(content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Content-Length"] = str(len(output_bytes))
    response.write(output_bytes)
    return response


@router.get("/formats", auth=django_auth)
def list_formats(request: HttpRequest):
    """List available post formats with dimensions."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)
    from .formats import FORMAT_REGISTRY

    return [
        {
            "key": k,
            "label": v["label"],
            "width": v["width"],
            "height": v["height"],
            "network": v.get("network", ""),
        }
        for k, v in FORMAT_REGISTRY.items()
    ]
