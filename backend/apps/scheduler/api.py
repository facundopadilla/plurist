from datetime import datetime

from django.utils import timezone as dj_timezone
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.security import django_auth

from apps.accounts.auth import get_membership, require_publisher_capabilities
from apps.accounts.models import Workspace
from apps.posts.models import DraftPost

from .models import ScheduleEntry

router = Router(tags=["scheduler"])


class ScheduleIn(Schema):
    draft_post_id: int
    network: str
    scheduled_for: str  # ISO datetime
    timezone: str = "UTC"


class ScheduleOut(Schema):
    id: int
    draft_post_id: int
    network: str
    scheduled_for: str
    timezone: str
    status: str
    created_at: str


def _workspace():
    workspace = Workspace.objects.first()
    if workspace is None:
        raise HttpError(400, "Workspace not bootstrapped")
    return workspace


def _entry_to_out(entry: ScheduleEntry) -> dict:
    return {
        "id": entry.pk,
        "draft_post_id": entry.draft_post_id,
        "network": entry.network,
        "scheduled_for": entry.scheduled_for.isoformat(),
        "timezone": entry.timezone,
        "status": entry.status,
        "created_at": entry.created_at.isoformat(),
    }


@router.get("/entries", auth=django_auth, response=list[ScheduleOut])
def list_entries(request):
    """List scheduled entries for the workspace."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    entries = ScheduleEntry.objects.filter(workspace=workspace)
    return [_entry_to_out(e) for e in entries]


@router.get("/entries/calendar", auth=django_auth, response=list[ScheduleOut])
def calendar_entries(request, start: str = "", end: str = ""):
    """List entries within a date range for calendar view."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    qs = ScheduleEntry.objects.filter(workspace=workspace)
    if start:
        qs = qs.filter(scheduled_for__gte=start)
    if end:
        qs = qs.filter(scheduled_for__lte=end)
    return [_entry_to_out(e) for e in qs]


@router.post("/entries", auth=django_auth, response={201: ScheduleOut})
def create_entry(request, payload: ScheduleIn):
    """Schedule a post (Owner/Publisher only). Post must be approved."""
    require_publisher_capabilities(request)
    workspace = _workspace()

    try:
        post = DraftPost.objects.get(pk=payload.draft_post_id, workspace=workspace)
    except DraftPost.DoesNotExist:
        raise HttpError(404, "Post not found")

    if post.status != DraftPost.Status.APPROVED:
        raise HttpError(400, "Only approved posts can be scheduled")

    scheduled_dt = datetime.fromisoformat(payload.scheduled_for)
    if dj_timezone.is_naive(scheduled_dt):
        import zoneinfo

        try:
            tz = zoneinfo.ZoneInfo(payload.timezone)
        except (KeyError, Exception):
            tz = zoneinfo.ZoneInfo("UTC")
        scheduled_dt = scheduled_dt.replace(tzinfo=tz)

    if scheduled_dt <= dj_timezone.now():
        raise HttpError(400, "Scheduled time must be in the future")

    entry = ScheduleEntry.objects.create(
        workspace=workspace,
        draft_post=post,
        network=payload.network,
        scheduled_for=scheduled_dt,
        timezone=payload.timezone,
        created_by=request.user,
    )
    return 201, _entry_to_out(entry)


@router.delete("/entries/{entry_id}", auth=django_auth)
def cancel_entry(request, entry_id: int):
    """Cancel a scheduled entry (Owner/Publisher)."""
    require_publisher_capabilities(request)
    workspace = _workspace()
    try:
        entry = ScheduleEntry.objects.get(pk=entry_id, workspace=workspace)
    except ScheduleEntry.DoesNotExist:
        raise HttpError(404, "Schedule entry not found")
    entry.cancel()
    return {"ok": True}


@router.get("/entries/{entry_id}", auth=django_auth, response=ScheduleOut)
def get_entry(request, entry_id: int):
    """Get a specific schedule entry."""
    membership = get_membership(request)
    if not membership:
        raise HttpError(403, "Membership required")
    workspace = _workspace()
    try:
        entry = ScheduleEntry.objects.get(pk=entry_id, workspace=workspace)
    except ScheduleEntry.DoesNotExist:
        raise HttpError(404, "Schedule entry not found")
    return _entry_to_out(entry)
