from django.conf import settings
from django.db import models

from apps.accounts.models import Workspace
from apps.posts.models import BrandProfileVersion


class CompareRun(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        PARTIAL_FAILURE = "partial_failure", "Partial Failure"

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="compare_runs",
    )
    brand_profile_version = models.ForeignKey(
        BrandProfileVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compare_runs",
    )
    template_key = models.CharField(max_length=255)
    campaign_brief = models.TextField()
    target_network = models.CharField(max_length=50, blank=True)
    providers = models.JSONField(default=list)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="compare_runs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
