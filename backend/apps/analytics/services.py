from .models import AuditEvent

_SUMMARY_EVENT_TYPES = [
    "content_created",
    "content_completed",
    "content_reverted",
]


def record_event(workspace, event_type, actor, target_type, target_id, metadata=None):
    """Record an audit event for the workspace."""
    return AuditEvent.objects.create(
        workspace=workspace,
        event_type=event_type,
        actor=actor,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata or {},
    )


def get_operational_summary(workspace):
    """Return counts of content workflow events for the workspace."""
    qs = AuditEvent.objects.filter(workspace=workspace)
    summary = {}
    for event_type in _SUMMARY_EVENT_TYPES:
        summary[event_type] = qs.filter(event_type=event_type).count()
    return summary
