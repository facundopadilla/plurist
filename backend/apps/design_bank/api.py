from typing import Any

from django.http import HttpRequest
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.accounts.auth import get_membership, require_editor_capabilities
from apps.accounts.models import RoleChoices
from apps.accounts.session_auth import session_auth as django_auth

from .design_system_service import (
    get_project_design_system_status,
    sync_project_design_system,
)
from .models import DesignBankSource
from .validators import validate_file_size, validate_url

router = Router(tags=["design_bank"])


class SourceOut(Schema):
    id: int
    source_type: str
    name: str
    original_filename: str
    storage_key: str
    url: str
    status: str
    extracted_data: dict
    resource_data: dict
    error_message: str
    project_id: int | None = None
    file_size_bytes: int | None = None
    created_at: str
    updated_at: str


class UrlIngestIn(Schema):
    url: str
    project_id: int | None = None


class ColorResourceIn(Schema):
    name: str
    hex: str
    role: str = ""
    project_id: int | None = None


class FontResourceIn(Schema):
    name: str
    family: str
    weights: list[int] = []
    project_id: int | None = None


class TextResourceIn(Schema):
    name: str
    content: str
    kind: str = "copy"
    project_id: int | None = None


class ResourcePatchIn(Schema):
    name: str | None = None
    resource_data: dict | None = None


class DesignSystemStatusOut(Schema):
    has_design_system: bool
    has_reference_brief: bool
    has_relevant_sources: bool
    is_outdated: bool
    relevant_source_count: int
    last_relevant_source_at: str | None = None
    artifact_revision: str | None = None
    design_system_source_id: int | None = None
    reference_brief_source_id: int | None = None
    has_manual_edits: bool


class DesignSystemSyncIn(Schema):
    provider: str = "openai"
    model_id: str | None = None
    guidance: str = ""


class DesignSystemSyncOut(Schema):
    ok: bool
    status: DesignSystemStatusOut
    design_system_source_id: int
    reference_brief_source_id: int


def _workspace_from_request(request):
    from apps.accounts.models import Workspace

    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _source_to_out(source: DesignBankSource) -> dict[str, Any]:
    return {
        "id": source.pk,
        "source_type": source.source_type,
        "name": source.name,
        "original_filename": source.original_filename,
        "storage_key": source.storage_key,
        "url": source.url,
        "status": source.status,
        "extracted_data": source.extracted_data,
        "resource_data": source.resource_data,
        "error_message": source.error_message,
        "project_id": source.project_id,
        "file_size_bytes": source.file_size_bytes,
        "created_at": source.created_at.isoformat(),
        "updated_at": source.updated_at.isoformat(),
    }


@router.post(
    "/sources/upload",
    auth=django_auth,
    response={201: SourceOut},
    summary="Upload a file to the design bank",
)
def upload_source(request: HttpRequest, file: UploadedFile, project_id: int | None = None):
    """Upload a file (Owner/Editor only). Queues async extraction."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    project = _get_project(workspace, project_id)

    validate_file_size(file.size or 0)

    # Determine source type from extension
    filename = file.name or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        source_type = DesignBankSource.SourceType.PDF
    elif ext in {"jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"}:
        source_type = DesignBankSource.SourceType.IMAGE
    elif ext == "css":
        source_type = DesignBankSource.SourceType.CSS
    elif ext == "html":
        source_type = DesignBankSource.SourceType.HTML
    elif ext in {"md", "markdown"}:
        source_type = DesignBankSource.SourceType.MARKDOWN
    else:
        source_type = DesignBankSource.SourceType.UPLOAD

    source = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=source_type,
        original_filename=filename,
        file_size_bytes=file.size,
        status=DesignBankSource.Status.PENDING,
        created_by=request.user,
    )

    # Upload to storage and queue extraction task asynchronously
    try:
        from .storage import generate_storage_key, upload_file

        storage_key = generate_storage_key(filename)
        upload_file(file.file, storage_key, file.content_type or "application/octet-stream")
        source.storage_key = storage_key
        source.save(update_fields=["storage_key", "updated_at"])

        from .tasks import extract_from_file

        extract_from_file.delay(source.pk)
    except Exception as exc:
        exc_str = str(exc)
        source.delete()
        if "ConnectionError" in type(exc).__name__ or "Max retries" in exc_str or "Connection refused" in exc_str:
            raise HttpError(503, "Cannot connect to storage (MinIO unavailable)")
        if "NoSuchBucket" in exc_str or "does not exist" in exc_str.lower():
            raise HttpError(503, "Storage bucket does not exist — contact the administrator")
        raise HttpError(500, f"Failed to upload file: {exc_str[:120]}")

    return 201, _source_to_out(source)


@router.post(
    "/sources/url",
    auth=django_auth,
    response={201: SourceOut},
    summary="Ingest a URL into the design bank",
)
def ingest_url(request: HttpRequest, payload: UrlIngestIn):
    """Ingest a URL (Owner/Editor only). Applies SSRF protection, queues async fetch."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)

    safe_url = validate_url(payload.url)

    project = _get_project(workspace, payload.project_id)

    source = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.URL,
        url=safe_url,
        status=DesignBankSource.Status.PENDING,
        created_by=request.user,
    )

    try:
        from .tasks import extract_from_url

        extract_from_url.delay(source.pk)
    except Exception:
        pass

    return 201, _source_to_out(source)


@router.get(
    "/sources",
    auth=django_auth,
    response=list[SourceOut],
    summary="List design bank sources for the workspace",
)
def list_sources(request: HttpRequest, project_id: int | None = None):
    """List all sources, optionally filtered by project. All workspace members can read."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    qs = DesignBankSource.objects.filter(workspace=workspace)
    if project_id is not None:
        qs = qs.filter(project_id=project_id)
    return [_source_to_out(s) for s in qs.order_by("-created_at")]


@router.get(
    "/projects/{project_id}/design-system/status",
    auth=django_auth,
    response=DesignSystemStatusOut,
    summary="Get compacted design-system status for a project",
)
def get_design_system_status(request: HttpRequest, project_id: int):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    _get_project(workspace, project_id)
    return get_project_design_system_status(project_id).to_dict()


@router.post(
    "/projects/{project_id}/design-system/sync",
    auth=django_auth,
    response=DesignSystemSyncOut,
    summary="Create or refresh compacted project design artifacts",
)
def sync_design_system(request: HttpRequest, project_id: int, payload: DesignSystemSyncIn):
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    _get_project(workspace, project_id)

    try:
        result = sync_project_design_system(
            project_id=project_id,
            workspace=workspace,
            user=request.user,
            provider_key=payload.provider,
            model_id=payload.model_id,
            guidance=payload.guidance,
        )
    except ValueError as exc:
        raise HttpError(400, str(exc))

    return {
        "ok": True,
        "status": result["status"].to_dict(),
        "design_system_source_id": result["design_system"].pk,
        "reference_brief_source_id": result["reference_brief"].pk,
    }


@router.get(
    "/sources/{source_id}",
    auth=django_auth,
    response=SourceOut,
    summary="Get a design bank source by ID",
)
def get_source(request: HttpRequest, source_id: int):
    """Source detail with extraction status. All workspace members can read."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, "Source not found")

    return _source_to_out(source)


@router.get(
    "/sources/{source_id}/file",
    auth=django_auth,
    summary="Redirect to a presigned URL for the source file",
)
def get_source_file(request: HttpRequest, source_id: int):
    """Redirect to a time-limited presigned URL for the source file (5 min TTL)."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, "Source not found")

    if not source.storage_key:
        raise HttpError(404, "No file stored for this source")

    from django.http import HttpResponseRedirect

    from .storage import generate_presigned_url

    url = generate_presigned_url(source.storage_key, expires_in=300)
    return HttpResponseRedirect(url)


def _get_project(workspace, project_id: int | None):
    if project_id is None:
        return None
    try:
        from apps.projects.models import Project

        return Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, "Project not found")


@router.post(
    "/sources/color",
    auth=django_auth,
    response={201: SourceOut},
    summary="Add a color resource to the design bank",
)
def add_color_resource(request: HttpRequest, payload: ColorResourceIn):
    """Add a color (hex + role) to the design bank (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    project = _get_project(workspace, payload.project_id)

    source = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.COLOR,
        name=payload.name,
        resource_data={"hex": payload.hex, "role": payload.role},
        status=DesignBankSource.Status.READY,
        created_by=request.user,
    )
    return 201, _source_to_out(source)


@router.post(
    "/sources/font",
    auth=django_auth,
    response={201: SourceOut},
    summary="Add a font resource to the design bank",
)
def add_font_resource(request: HttpRequest, payload: FontResourceIn):
    """Add a font (family + weights) to the design bank (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    project = _get_project(workspace, payload.project_id)

    source = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.FONT,
        name=payload.name,
        resource_data={"family": payload.family, "weights": payload.weights},
        status=DesignBankSource.Status.READY,
        created_by=request.user,
    )
    return 201, _source_to_out(source)


@router.post(
    "/sources/text",
    auth=django_auth,
    response={201: SourceOut},
    summary="Add a text/copy resource to the design bank",
)
def add_text_resource(request: HttpRequest, payload: TextResourceIn):
    """Add brand copy / voice notes to the design bank (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    project = _get_project(workspace, payload.project_id)

    source = DesignBankSource.objects.create(
        workspace=workspace,
        project=project,
        source_type=DesignBankSource.SourceType.TEXT,
        name=payload.name,
        resource_data={"content": payload.content, "kind": payload.kind},
        status=DesignBankSource.Status.READY,
        created_by=request.user,
    )
    return 201, _source_to_out(source)


@router.patch(
    "/sources/{source_id}",
    auth=django_auth,
    response=SourceOut,
    summary="Update a design bank source name or resource_data",
)
def patch_source(request: HttpRequest, source_id: int, payload: ResourcePatchIn):
    """Update name/resource_data on a source (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, "Source not found")

    update_fields = ["updated_at"]
    if payload.name is not None:
        source.name = payload.name
        update_fields.append("name")
    if payload.resource_data is not None:
        source.resource_data = payload.resource_data
        update_fields.append("resource_data")

    source.save(update_fields=update_fields)
    return _source_to_out(source)


class ContentUpdateIn(Schema):
    content: str


@router.put(
    "/sources/{source_id}/content",
    auth=django_auth,
    response=SourceOut,
    summary="Replace the file content of a code/text source",
)
def update_source_content(request: HttpRequest, source_id: int, payload: ContentUpdateIn):
    """Overwrite file content in storage (HTML/CSS/Markdown/etc). Owner/Editor only."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, "Source not found")

    if not source.storage_key:
        raise HttpError(400, "Source has no stored file")

    import io

    from .storage import upload_file

    content_bytes = payload.content.encode("utf-8")
    upload_file(
        io.BytesIO(content_bytes),
        source.storage_key,
        "text/html; charset=utf-8",
    )
    source.extracted_data = {
        **dict(source.extracted_data or {}),
        "text_snippet": payload.content[:4096],
    }
    source.save(update_fields=["extracted_data", "updated_at"])
    return _source_to_out(source)


@router.delete(
    "/sources/{source_id}",
    auth=django_auth,
    response={204: None},
    summary="Delete a design bank source",
)
def delete_source(request: HttpRequest, source_id: int):
    """Delete a source (Owner/Editor only)."""
    membership = require_editor_capabilities(request)
    workspace = _workspace_from_request(request)

    # Owner check for destructive delete
    if membership.role not in {RoleChoices.OWNER, RoleChoices.EDITOR}:
        raise HttpError(403, "Insufficient permissions")

    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, "Source not found")

    if source.storage_key:
        try:
            from .storage import delete_file

            delete_file(source.storage_key)
        except Exception:
            pass

    source.delete()
    return 204, None
