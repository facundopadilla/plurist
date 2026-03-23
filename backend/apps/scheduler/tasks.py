"""
Celery tasks for the scheduler — periodically checks for entries
whose scheduled_for has passed and triggers them.
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def check_pending_schedules():
    """
    Find all pending schedule entries whose time has come and trigger them.
    This task should be called periodically (e.g. every minute via celery-beat).
    """
    from .models import ScheduleEntry

    now = timezone.now()
    due_entries = ScheduleEntry.objects.filter(
        status=ScheduleEntry.Status.PENDING,
        scheduled_for__lte=now,
    ).select_related("draft_post")

    triggered_count = 0
    for entry in due_entries:
        # Verify the post is still approved (material edits invalidate approval)
        if entry.draft_post.status != "approved":
            logger.warning(
                "Schedule entry %s: post %s no longer approved (status=%s), cancelling",
                entry.pk,
                entry.draft_post_id,
                entry.draft_post.status,
            )
            entry.status = ScheduleEntry.Status.CANCELLED
            entry.save(update_fields=["status", "updated_at"])
            continue

        entry.trigger()
        triggered_count += 1

        # Create PublishAttempt rows and enqueue Celery tasks via the
        # same helper used by the publish-now API endpoint.
        try:
            from apps.publishing.api import _do_publish_now

            idempotency_key = f"schedule-{entry.pk}"
            _do_publish_now(
                post=entry.draft_post,
                actor=entry.created_by,
                idempotency_key=idempotency_key,
            )
            logger.info(
                "Schedule entry %s triggered publish for post %s on %s",
                entry.pk,
                entry.draft_post_id,
                entry.network,
            )
        except Exception:
            logger.exception(
                "Schedule entry %s: failed to enqueue publish for post %s",
                entry.pk,
                entry.draft_post_id,
            )

    return triggered_count
