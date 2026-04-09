from __future__ import annotations

from celery import shared_task

from .models import CompareRun
from .services import run_compare


@shared_task(bind=True, max_retries=0)
def run_compare_task(self, compare_run_id: int) -> None:
    """Async Celery task that runs generation for a compare run."""
    compare_run = CompareRun.objects.select_related("workspace", "created_by", "project", "brand_profile_version").get(
        pk=compare_run_id
    )

    try:
        run_compare(compare_run)
    except Exception as exc:
        compare_run.status = CompareRun.Status.PARTIAL_FAILURE
        compare_run.save(update_fields=["status"])
        raise exc
