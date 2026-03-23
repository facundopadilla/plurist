# pyright: reportArgumentType=false

from django.conf import settings
from django.db import models

from apps.accounts.models import Workspace
from apps.posts.models import BrandProfileVersion


class RenderJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RENDERING = "rendering", "Rendering"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="render_jobs")
    template_key = models.CharField(max_length=100)
    brand_profile_version = models.ForeignKey(
        BrandProfileVersion,
        on_delete=models.CASCADE,
        related_name="render_jobs",
    )
    input_variables = models.JSONField(default=dict)
    input_hash = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    output_storage_key = models.CharField(max_length=512, blank=True)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="render_jobs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
