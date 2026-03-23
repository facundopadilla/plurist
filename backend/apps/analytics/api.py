from typing import Any, Optional

from django.http import HttpRequest
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.security import django_auth

from apps.accounts.auth import get_membership

from .models import AuditEvent
from .services import get_operational_summary

router = Router(tags=["analytics"])


class OperationalSummaryOut(Schema):
    publish_requested: int
    publish_succeeded: int
    publish_failed: int
    approval_requested: int
    approval_approved: int
    approval_rejected: int


class AuditEventOut(Schema):
    id: int
    event_type: str
    actor_id: Optional[int]
    target_type: str
    target_id: int
    metadata: dict
    created_at: str


def _workspace_from_request(request):
    from apps.accounts.models import Workspace

    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _event_to_out(event: AuditEvent) -> dict[str, Any]:
    return {
        "id": event.pk,
        "event_type": event.event_type,
        "actor_id": event.actor_id,
        "target_type": event.target_type,
        "target_id": event.target_id,
        "metadata": event.metadata,
        "created_at": event.created_at.isoformat(),
    }


@router.get(
    "/summary",
    auth=django_auth,
    response=OperationalSummaryOut,
    summary="Operational workflow summary for the workspace",
)
def operational_summary(request: HttpRequest):
    """Return counts of workflow events. All workspace members can access."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    summary = get_operational_summary(workspace)
    return summary


@router.get(
    "/timeline",
    auth=django_auth,
    response=list[AuditEventOut],
    summary="Recent audit events for the workspace",
)
def audit_timeline(request: HttpRequest, limit: int = 50):
    """List recent audit events. All workspace members can access."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    events = AuditEvent.objects.filter(workspace=workspace).order_by("-created_at")[:limit]
    return [_event_to_out(e) for e in events]


@router.get(
    "/timeline/{target_type}/{target_id}",
    auth=django_auth,
    response=list[AuditEventOut],
    summary="Audit events for a specific target",
)
def target_timeline(request: HttpRequest, target_type: str, target_id: int):
    """List audit events for a specific target object. All workspace members can access."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")

    workspace = _workspace_from_request(request)
    events = AuditEvent.objects.filter(
        workspace=workspace,
        target_type=target_type,
        target_id=target_id,
    ).order_by("-created_at")
    return [_event_to_out(e) for e in events]
