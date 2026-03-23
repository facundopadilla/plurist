# pyright: reportArgumentType=false

from django.conf import settings
from django.db import models


class ApprovalDecision(models.Model):
    class Decision(models.TextChoices):
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    draft_post = models.ForeignKey(
        "posts.DraftPost",
        on_delete=models.CASCADE,
        related_name="approval_decisions",
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval_decisions",
    )
    decision = models.CharField(max_length=20, choices=Decision.choices)
    reason = models.TextField(blank=True)
    invalidated = models.BooleanField(default=False)
    decided_at = models.DateTimeField(auto_now_add=True)


class ApprovedSnapshot(models.Model):
    draft_post = models.OneToOneField(
        "posts.DraftPost",
        on_delete=models.CASCADE,
        related_name="approved_snapshot",
    )
    approval_decision = models.ForeignKey(
        ApprovalDecision,
        on_delete=models.CASCADE,
        related_name="snapshots",
    )
    snapshot_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
