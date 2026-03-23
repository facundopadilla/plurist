# pyright: reportArgumentType=false

from django.conf import settings
from django.db import models

from apps.accounts.models import Workspace


class SocialConnection(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    network = models.CharField(max_length=20)
    display_name = models.CharField(max_length=255)
    credentials_enc = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="social_connections",
    )


class PublishAttempt(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PUBLISHING = "publishing", "Publishing"
        PUBLISHED = "published", "Published"
        FAILED = "failed", "Failed"

    draft_post = models.ForeignKey(
        "posts.DraftPost",
        on_delete=models.CASCADE,
        related_name="publish_attempts",
    )
    approved_snapshot = models.ForeignKey(
        "approvals.ApprovedSnapshot",
        on_delete=models.CASCADE,
        related_name="publish_attempts",
    )
    network = models.CharField(max_length=20)
    idempotency_key = models.CharField(max_length=255, blank=True, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    external_post_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)


class ScheduledPublication(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TRIGGERED = "triggered", "Triggered"
        CANCELLED = "cancelled", "Cancelled"

    draft_post = models.ForeignKey(
        "posts.DraftPost",
        on_delete=models.CASCADE,
        related_name="scheduled_publications",
    )
    approved_snapshot = models.ForeignKey(
        "approvals.ApprovedSnapshot",
        on_delete=models.CASCADE,
        related_name="scheduled_publications",
    )
    network = models.CharField(max_length=20)
    scheduled_for = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scheduled_publications",
    )
