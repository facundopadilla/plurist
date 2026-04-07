import re

from django.http import HttpRequest
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from pydantic import field_validator

from apps.accounts.auth import (
    get_membership,
    require_editor_capabilities,
    require_owner,
)
from apps.accounts.session_auth import session_auth as django_auth

from .models import Project

router = Router(tags=["projects"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

_ALLOWED_ICON_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
_MAX_ICON_SIZE = 2 * 1024 * 1024  # 2 MB
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _validate_hex_color(v: str) -> str:
    if not _HEX_COLOR_RE.match(v):
        raise ValueError("Color must be a 6-digit hex string (e.g. #6366f1)")
    return v


class TagIn(Schema):
    name: str
    color: str = "#6b7280"

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        return _validate_hex_color(v)


class ProjectIn(Schema):
    name: str
    description: str = ""
    tags: list[TagIn] = []
    color: str = "#6366f1"

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        return _validate_hex_color(v)


class ProjectPatchIn(Schema):
    name: str | None = None
    description: str | None = None
    tags: list[TagIn] | None = None
    color: str | None = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_hex_color(v)
        return v


class ProjectOut(Schema):
    id: int
    name: str
    description: str
    tags: list
    color: str
    icon_url: str
    created_at: str
    updated_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _workspace_from_request(request):
    from apps.accounts.models import Workspace

    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _normalize_tags(tags: list) -> list[dict]:
    """Normalize tags — handles legacy string format and new dict format."""
    result = []
    for tag in tags:
        if isinstance(tag, str):
            result.append({"name": tag, "color": "#6b7280"})
        elif isinstance(tag, dict):
            result.append({"name": tag.get("name", ""), "color": tag.get("color", "#6b7280")})
    return result


def _project_out(project: Project) -> dict:
    icon_url = ""
    if project.icon_storage_key:
        icon_url = f"/api/v1/projects/{project.pk}/icon"
    return {
        "id": project.pk,
        "name": project.name,
        "description": project.description,
        "tags": _normalize_tags(list(project.tags or [])),
        "color": project.color or "#6366f1",
        "icon_url": icon_url,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", auth=django_auth, response=list[ProjectOut])
def list_projects(request: HttpRequest):
    """List all projects for the workspace."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace_from_request(request)
    return [_project_out(p) for p in Project.objects.filter(workspace=workspace)]


@router.post("", auth=django_auth, response={201: ProjectOut})
def create_project(request: HttpRequest, payload: ProjectIn):
    """Create a new project (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    project = Project.objects.create(
        workspace=workspace,
        name=payload.name,
        description=payload.description,
        tags=[{"name": t.name, "color": t.color} for t in payload.tags],
        color=payload.color,
        created_by=request.user,
    )
    return 201, _project_out(project)


@router.get("/{project_id}", auth=django_auth, response=ProjectOut)
def get_project(request: HttpRequest, project_id: int):
    """Get project detail."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace_from_request(request)
    try:
        project = Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, "Project not found")
    return _project_out(project)


@router.patch("/{project_id}", auth=django_auth, response=ProjectOut)
def update_project(request: HttpRequest, project_id: int, payload: ProjectPatchIn):
    """Update a project (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    try:
        project = Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, "Project not found")

    update_fields = ["updated_at"]
    if payload.name is not None:
        project.name = payload.name
        update_fields.append("name")
    if payload.description is not None:
        project.description = payload.description
        update_fields.append("description")
    if payload.tags is not None:
        project.tags = [{"name": t.name, "color": t.color} for t in payload.tags]
        update_fields.append("tags")
    if payload.color is not None:
        project.color = payload.color
        update_fields.append("color")

    project.save(update_fields=update_fields)
    return _project_out(project)


@router.post("/{project_id}/icon", auth=django_auth, response=ProjectOut)
def upload_project_icon(request: HttpRequest, project_id: int, file: UploadedFile):
    """Upload a custom icon (jpg/png/webp, max 2MB) for a project (Owner/Editor only)."""
    require_editor_capabilities(request)
    workspace = _workspace_from_request(request)
    try:
        project = Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, "Project not found")

    filename = file.name or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in _ALLOWED_ICON_EXTENSIONS:
        raise HttpError(400, "Icon must be jpg, png or webp")

    size = file.size or 0
    if size > _MAX_ICON_SIZE:
        raise HttpError(400, "Icon must be smaller than 2 MB")

    try:
        from apps.design_bank.storage import generate_storage_key, upload_file

        storage_key = generate_storage_key(f"project-icon-{project_id}-{filename}")
        upload_file(file.file, storage_key, file.content_type or "image/jpeg")
        project.icon_storage_key = storage_key
        project.save(update_fields=["icon_storage_key", "updated_at"])
    except Exception as exc:
        exc_str = str(exc)
        if "ConnectionError" in type(exc).__name__ or "Max retries" in exc_str or "Connection refused" in exc_str:
            raise HttpError(503, "Cannot connect to storage (MinIO unavailable)")
        if "NoSuchBucket" in exc_str or "does not exist" in exc_str.lower():
            raise HttpError(503, "Storage bucket does not exist — contact the administrator")
        raise HttpError(500, f"Failed to upload icon: {exc_str[:120]}")

    return _project_out(project)


@router.get("/{project_id}/icon", auth=django_auth)
def get_project_icon(request: HttpRequest, project_id: int):
    """Redirect to a presigned URL for the project icon (5 min TTL)."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace_from_request(request)
    try:
        project = Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, "Project not found")

    if not project.icon_storage_key:
        raise HttpError(404, "No icon for this project")

    from django.http import HttpResponseRedirect

    from apps.design_bank.storage import generate_presigned_url

    url = generate_presigned_url(project.icon_storage_key, expires_in=300)
    return HttpResponseRedirect(url)


@router.delete("/{project_id}", auth=django_auth, response={204: None})
def delete_project(request: HttpRequest, project_id: int, cascade_posts: bool = False):
    """Delete a project (Owner only). DesignBankSources always cascade. Posts cascade only if cascade_posts=True."""
    require_owner(request)
    workspace = _workspace_from_request(request)
    try:
        project = Project.objects.get(pk=project_id, workspace=workspace)
    except Project.DoesNotExist:
        raise HttpError(404, "Project not found")

    if cascade_posts:
        from apps.posts.models import DraftPost

        DraftPost.objects.filter(project=project).delete()

    project.delete()
    return 204, None
