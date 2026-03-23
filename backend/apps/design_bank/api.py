from typing import Any

from django.http import HttpRequest
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import get_membership, require_editor_capabilities
from apps.accounts.models import RoleChoices

from .models import DesignBankSource
from .validators import validate_file_size, validate_url

router = Router(tags=["design_bank"])


class SourceOut(Schema):
    id: int
    source_type: str
    original_filename: str
    storage_key: str
    url: str
    status: str
    extracted_data: dict
    error_message: str
    created_at: str
    updated_at: str


class UrlIngestIn(Schema):
    url: str


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
        "original_filename": source.original_filename,
        "storage_key": source.storage_key,
        "url": source.url,
        "status": source.status,
        "extracted_data": source.extracted_data,
        "error_message": source.error_message,
        "created_at": source.created_at.isoformat(),
        "updated_at": source.updated_at.isoformat(),
    }


@router.post(
    "/sources/upload",
    auth=django_auth,
    response={201: SourceOut},
    summary="Upload a file to the design bank",
)
def upload_source(request: HttpRequest, file: UploadedFile):
    """Upload a file (Owner/Editor only). Queues async extraction."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)

    validate_file_size(file.size or 0)

    # Determine source type from extension
    filename = file.name or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        source_type = DesignBankSource.SourceType.PDF
    elif ext in {"jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"}:
        source_type = DesignBankSource.SourceType.IMAGE
    else:
        source_type = DesignBankSource.SourceType.UPLOAD

    source = DesignBankSource.objects.create(
        workspace=workspace,
        source_type=source_type,
        original_filename=filename,
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
    except Exception:
        # Storage/queue unavailable — leave as pending, don't fail the request
        pass

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

    source = DesignBankSource.objects.create(
        workspace=workspace,
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
def list_sources(request: HttpRequest):
    """List all sources. Owners, Editors and Publishers can read."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    sources = DesignBankSource.objects.filter(workspace=workspace).order_by("-created_at")
    return [_source_to_out(s) for s in sources]


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
