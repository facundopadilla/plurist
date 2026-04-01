"""Legacy render task placeholders after removing the Playwright pipeline."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


def _get_job(render_job_id: int):
    from .models import RenderJob

    return RenderJob.objects.filter(pk=render_job_id).first()


@shared_task(bind=True, max_retries=2)
def render_template(self, render_job_id: int):
    """Mark legacy render jobs as failed after the Playwright pipeline removal."""
    from .models import RenderJob

    job = _get_job(render_job_id)
    if job is None:
        logger.warning("render_template: job %s not found", render_job_id)
        return

    logger.warning("render_template: legacy task invoked for job %s", render_job_id)
    job.status = RenderJob.Status.FAILED
    job.error_message = "Server-side Playwright rendering was removed. Use the client-side canvas export flow."
    job.save(update_fields=["status", "error_message", "updated_at"])
