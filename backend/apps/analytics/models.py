# pyright: reportArgumentType=false

from django.conf import settings
from django.db import models

from apps.accounts.models import Workspace


class AuditEvent(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="audit_events",
    )
    event_type = models.CharField(max_length=50)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    target_type = models.CharField(max_length=50)
    target_id = models.IntegerField()
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
