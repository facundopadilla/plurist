# pyright: reportAttributeAccessIssue=false

from django.core.exceptions import ValidationError
from ninja import Router, Schema
from ninja.errors import HttpError
from apps.accounts.session_auth import session_auth as django_auth

from apps.accounts.auth import (
    get_membership,
    require_editor_capabilities,
    require_owner,
    require_publisher_capabilities,
)
from apps.posts.models import DraftPost

router = Router(tags=["posts"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class DraftPostIn(Schema):
    title: str
    body_text: str = ""
    target_networks: list[str] = []
    render_asset_key: str = ""


class DraftPostOut(Schema):
    id: int
    title: str
    body_text: str
    target_networks: list[str]
    render_asset_key: str
    status: str
    submitted_at: str | None = None
    approved_at: str | None = None
    published_at: str | None = None
    failure_message: str


class ReasonIn(Schema):
    reason: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _post_out(post: DraftPost) -> DraftPostOut:
    return DraftPostOut(
        id=post.pk,
        title=post.title,
        body_text=post.body_text,
        target_networks=list(post.target_networks or []),
        render_asset_key=post.render_asset_key,
        status=post.status,
        submitted_at=post.submitted_at.isoformat() if post.submitted_at else None,
        approved_at=post.approved_at.isoformat() if post.approved_at else None,
        published_at=post.published_at.isoformat() if post.published_at else None,
        failure_message=post.failure_message,
    )


def _get_post_for_workspace(post_id: int, workspace) -> DraftPost:
    post = DraftPost.objects.filter(pk=post_id, workspace=workspace).first()
    if not post:
        raise HttpError(404, "Post not found")
    return post


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/", auth=django_auth, response=list[DraftPostOut])
def list_posts(request):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    posts = DraftPost.objects.filter(workspace=membership.workspace).order_by("-created_at")
    return [_post_out(p) for p in posts]


@router.post("/", auth=django_auth, response={201: DraftPostOut})
def create_post(request, payload: DraftPostIn):
    membership = require_editor_capabilities(request)
    post = DraftPost.objects.create(
        workspace=membership.workspace,
        created_by=request.user,
        title=payload.title,
        body_text=payload.body_text,
        target_networks=payload.target_networks,
        render_asset_key=payload.render_asset_key,
    )
    return 201, _post_out(post)


@router.get("/{post_id}", auth=django_auth, response=DraftPostOut)
def get_post(request, post_id: int):
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    post = _get_post_for_workspace(post_id, membership.workspace)
    return _post_out(post)


@router.post("/{post_id}/submit", auth=django_auth, response=DraftPostOut)
def submit_post(request, post_id: int):
    membership = require_editor_capabilities(request)
    post = _get_post_for_workspace(post_id, membership.workspace)
    try:
        post.submit_for_approval(request.user)
    except (ValidationError, PermissionError) as exc:
        raise HttpError(400, str(exc))
    return _post_out(post)


@router.post("/{post_id}/approve", auth=django_auth, response=DraftPostOut)
def approve_post(request, post_id: int, payload: ReasonIn):
    membership = require_owner(request)
    post = _get_post_for_workspace(post_id, membership.workspace)
    try:
        post.approve(request.user, reason=payload.reason)
    except (ValidationError, PermissionError) as exc:
        raise HttpError(400, str(exc))
    return _post_out(post)


@router.post("/{post_id}/reject", auth=django_auth, response=DraftPostOut)
def reject_post(request, post_id: int, payload: ReasonIn):
    membership = require_owner(request)
    post = _get_post_for_workspace(post_id, membership.workspace)
    try:
        post.reject(request.user, reason=payload.reason)
    except (ValidationError, PermissionError) as exc:
        raise HttpError(400, str(exc))
    return _post_out(post)


@router.post("/{post_id}/publish", auth=django_auth, response={202: DraftPostOut})
def publish_post(request, post_id: int):
    """Trigger immediate publish for an approved post (Owner/Publisher only)."""
    membership = require_publisher_capabilities(request)
    post = _get_post_for_workspace(post_id, membership.workspace)

    if post.status != DraftPost.Status.APPROVED:
        raise HttpError(400, "Post must be in approved status to publish")

    # Delegate to the publishing API's idempotent handler.
    from apps.publishing.api import _do_publish_now

    idempotency_key = request.headers.get("Idempotency-Key", "")
    attempts = _do_publish_now(post, actor=request.user, idempotency_key=idempotency_key)  # noqa: F841

    post.refresh_from_db()
    return 202, _post_out(post)
