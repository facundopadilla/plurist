from .models import AuditEvent

_SUMMARY_EVENT_TYPES = [
    "publish_requested",
    "publish_succeeded",
    "publish_failed",
    "approval_requested",
    "approval_approved",
    "approval_rejected",
]


def record_event(workspace, event_type, actor, target_type, target_id, metadata=None):
    """Record a workflow audit event for the workspace."""
    return AuditEvent.objects.create(
        workspace=workspace,
        event_type=event_type,
        actor=actor,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata or {},
    )


def get_operational_summary(workspace):
    """Return counts of operational workflow events for the workspace.

    Only includes workflow telemetry — no engagement metrics.
    """
    qs = AuditEvent.objects.filter(workspace=workspace)
    summary = {}
    for event_type in _SUMMARY_EVENT_TYPES:
        summary[event_type] = qs.filter(event_type=event_type).count()
    return summary
