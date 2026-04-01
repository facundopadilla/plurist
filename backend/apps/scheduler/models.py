# pyright: reportArgumentType=false

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.accounts.models import Workspace
from apps.posts.models import DraftPost


class ScheduleEntry(models.Model):
    """A scheduled publication for an approved draft post."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TRIGGERED = "triggered", "Triggered"
        CANCELLED = "cancelled", "Cancelled"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="schedule_entries")
    draft_post = models.ForeignKey(DraftPost, on_delete=models.CASCADE, related_name="schedule_entries")
    network = models.CharField(max_length=20)
    scheduled_for = models.DateTimeField()
    timezone = models.CharField(max_length=50, default="UTC")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="schedule_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_for"]

    def clean(self):
        if self.draft_post.status != DraftPost.Status.APPROVED:
            raise ValidationError("Only approved posts can be scheduled")

    def save(self, *args, **kwargs):
        # Only validate approval status on creation, not on status/field updates
        if not self.pk:
            self.full_clean()
        super().save(*args, **kwargs)

    def cancel(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Only pending schedules can be cancelled")
        self.status = self.Status.CANCELLED
        self.save(update_fields=["status", "updated_at"])

    def trigger(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Only pending schedules can be triggered")
        self.status = self.Status.TRIGGERED
        self.save(update_fields=["status", "updated_at"])
