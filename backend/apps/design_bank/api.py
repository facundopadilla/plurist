import io
import logging
from typing import Any

from django.http import HttpRequest, HttpResponseRedirect
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.accounts.auth import MEMBERSHIP_REQUIRED_DETAIL, get_membership, require_editor_capabilities
from apps.accounts.models import RoleChoices, Workspace
from apps.accounts.session_auth import session_auth as django_auth
from apps.projects.models import Project

from .constants import (
    DEFAULT_CONTENT_TYPE_INLINE,
    IMAGE_UPLOAD_EXTENSIONS,
    INSUFFICIENT_PERMISSIONS,
    MARKDOWN_UPLOAD_EXTENSIONS,
    NO_FILE_STORED_FOR_SOURCE,
    PRESIGNED_URL_TTL_SECONDS,
    PROJECT_NOT_FOUND,
    SOURCE_HAS_NO_STORED_FILE,
    SOURCE_NOT_FOUND,
    STORAGE_BUCKET_MISSING,
    STORAGE_MINIO_UNAVAILABLE,
    STORAGE_UPLOAD_FAILED_PREFIX,
    TEXT_SNIPPET_MAX_CHARS,
    UPLOAD_ERROR_MESSAGE_MAX_CHARS,
    WORKSPACE_NOT_BOOTSTRAPPED,
)
from .design_system_service import (
    get_project_design_system_status,
    sync_project_design_system,
)
from .models import DesignBankSource
from .validators import validate_file_size, validate_url

logger = logging.getLogger(__name__)

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


def _workspace_from_request(_request: HttpRequest) -> Workspace:
    """Return the singleton workspace or 400 if not bootstrapped."""
    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, WORKSPACE_NOT_BOOTSTRAPPED)
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

    filename = file.name or ""
    source_type = _infer_upload_source_type(filename)

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
        _upload_source_file(source, file, filename)
    except Exception as exc:
        source.delete()
        _raise_upload_storage_error(exc)

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
        # Imported here so tests can monkeypatch apps.design_bank.tasks before delay().
        from .tasks import extract_from_url

        extract_from_url.delay(source.pk)
    except Exception:
        logger.exception("Failed to queue extract_from_url for source pk=%s", source.pk)

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
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

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
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

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
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    workspace = _workspace_from_request(request)
    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, SOURCE_NOT_FOUND)

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
        raise HttpError(403, MEMBERSHIP_REQUIRED_DETAIL)

    workspace = _workspace_from_request(request)
    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, SOURCE_NOT_FOUND)

    if not source.storage_key:
        raise HttpError(404, NO_FILE_STORED_FOR_SOURCE)

    # Imported here so tests can monkeypatch apps.design_bank.storage.
    from .storage import generate_presigned_url

    url = generate_presigned_url(source.storage_key, expires_in=PRESIGNED_URL_TTL_SECONDS)
    return HttpResponseRedirect(url)


def _get_project(workspace: Workspace, project_id: int | None):
    if project_id is None:
        return None
    try:
        return Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, PROJECT_NOT_FOUND)


def _infer_upload_source_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    match ext:
        case "pdf":
            return DesignBankSource.SourceType.PDF
        case "css":
            return DesignBankSource.SourceType.CSS
        case "html":
            return DesignBankSource.SourceType.HTML
        case e if e in IMAGE_UPLOAD_EXTENSIONS:
            return DesignBankSource.SourceType.IMAGE
        case e if e in MARKDOWN_UPLOAD_EXTENSIONS:
            return DesignBankSource.SourceType.MARKDOWN
        case _:
            return DesignBankSource.SourceType.UPLOAD


def _raise_upload_storage_error(exc: Exception) -> None:
    exc_str = str(exc)
    exc_name = type(exc).__name__
    if "ConnectionError" in exc_name or "Max retries" in exc_str or "Connection refused" in exc_str:
        raise HttpError(503, STORAGE_MINIO_UNAVAILABLE)
    if "NoSuchBucket" in exc_str or "does not exist" in exc_str.lower():
        raise HttpError(503, STORAGE_BUCKET_MISSING)
    raise HttpError(
        500,
        f"{STORAGE_UPLOAD_FAILED_PREFIX} {exc_str[:UPLOAD_ERROR_MESSAGE_MAX_CHARS]}",
    )


def _upload_source_file(source: DesignBankSource, file: UploadedFile, filename: str) -> None:
    # Imported here so tests can monkeypatch apps.design_bank.storage / tasks.
    from .storage import generate_storage_key, upload_file
    from .tasks import extract_from_file

    storage_key = generate_storage_key(filename)
    upload_file(file.file, storage_key, file.content_type or "application/octet-stream")
    source.storage_key = storage_key
    source.save(update_fields=["storage_key", "updated_at"])
    extract_from_file.delay(source.pk)


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
        raise HttpError(404, SOURCE_NOT_FOUND)

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
        raise HttpError(404, SOURCE_NOT_FOUND)

    if not source.storage_key:
        raise HttpError(400, SOURCE_HAS_NO_STORED_FILE)

    from .storage import upload_file

    content_bytes = payload.content.encode("utf-8")
    upload_file(
        io.BytesIO(content_bytes),
        source.storage_key,
        DEFAULT_CONTENT_TYPE_INLINE,
    )
    source.extracted_data = {
        **dict(source.extracted_data or {}),
        "text_snippet": payload.content[:TEXT_SNIPPET_MAX_CHARS],
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
        raise HttpError(403, INSUFFICIENT_PERMISSIONS)

    try:
        source = DesignBankSource.objects.get(pk=source_id, workspace=workspace)
    except DesignBankSource.DoesNotExist:
        raise HttpError(404, SOURCE_NOT_FOUND)

    if source.storage_key:
        try:
            from .storage import delete_file

            delete_file(source.storage_key)
        except Exception as exc:
            logger.warning(
                "Could not delete storage object %s for source %s: %s",
                source.storage_key,
                source.pk,
                exc,
                exc_info=True,
            )

    source.delete()
    return 204, None
