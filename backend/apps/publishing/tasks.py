# pyright: reportAttributeAccessIssue=false

import logging

from celery import shared_task
from django.utils import timezone

from apps.integrations.registry import get_adapter

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def execute_publish(self, publish_attempt_id: int) -> None:
    """Execute a single publish attempt against the target social network.

    Loads the PublishAttempt and its approved snapshot, calls the adapter,
    and updates the attempt + post status.
    """
    from apps.publishing.models import PublishAttempt

    try:
        attempt = PublishAttempt.objects.select_related(
            "draft_post", "approved_snapshot"
        ).get(pk=publish_attempt_id)
    except PublishAttempt.DoesNotExist:
        logger.error("PublishAttempt %s not found", publish_attempt_id)
        return

    if attempt.status not in (
        PublishAttempt.Status.PENDING,
        PublishAttempt.Status.PUBLISHING,
    ):
        # Already completed; skip.
        return

    attempt.status = PublishAttempt.Status.PUBLISHING
    attempt.save(update_fields=["status"])

    draft_post = attempt.draft_post
    snapshot = attempt.approved_snapshot

    adapter = get_adapter(attempt.network)
    content = dict(snapshot.snapshot_data)

    try:
        result = adapter.publish(connection=None, content=content)
    except Exception as exc:
        logger.exception(
            "Unhandled error publishing attempt %s: %s", publish_attempt_id, exc
        )
        attempt.status = PublishAttempt.Status.FAILED
        attempt.error_message = str(exc)
        attempt.completed_at = timezone.now()
        attempt.save(update_fields=["status", "error_message", "completed_at"])

        # Transition post to failed only if it is still in publishing state.
        draft_post.refresh_from_db(fields=["status"])
        if draft_post.status == draft_post.Status.PUBLISHING:
            try:
                draft_post.mark_failed(str(exc))
            except Exception:
                pass
        return

    if result.success:
        attempt.status = PublishAttempt.Status.PUBLISHED
        attempt.external_post_id = result.external_post_id
        attempt.completed_at = timezone.now()
        attempt.save(
            update_fields=["status", "external_post_id", "completed_at"]
        )

        # Only mark the post published when ALL attempts for this post are done.
        draft_post.refresh_from_db(fields=["status"])
        if draft_post.status == draft_post.Status.PUBLISHING:
            remaining = PublishAttempt.objects.filter(
                draft_post=draft_post,
                status__in=(
                    PublishAttempt.Status.PENDING,
                    PublishAttempt.Status.PUBLISHING,
                ),
            ).exclude(pk=attempt.pk).count()
            if remaining == 0:
                try:
                    draft_post.mark_published()
                except Exception:
                    pass
    else:
        attempt.status = PublishAttempt.Status.FAILED
        attempt.error_message = result.error
        attempt.completed_at = timezone.now()
        attempt.save(update_fields=["status", "error_message", "completed_at"])

        draft_post.refresh_from_db(fields=["status"])
        if draft_post.status == draft_post.Status.PUBLISHING:
            try:
                draft_post.mark_failed(result.error)
            except Exception:
                pass
