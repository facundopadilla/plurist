from django.conf import settings
from django.db import models

from apps.accounts.models import Workspace


class DesignBankSource(models.Model):
    class SourceType(models.TextChoices):
        UPLOAD = "upload", "Upload"
        URL = "url", "URL"
        PDF = "pdf", "PDF"
        IMAGE = "image", "Image"
        CSS = "css", "CSS"
        COLOR = "color", "Color"
        FONT = "font", "Font"
        LOGO = "logo", "Logo"
        TEXT = "text", "Text"
        HTML = "html", "HTML"
        DESIGN_SYSTEM = "design_system", "Design System"
        MARKDOWN = "markdown", "Markdown"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="design_bank_sources",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="design_bank_sources",
    )
    name = models.CharField(max_length=255, blank=True)
    resource_data = models.JSONField(default=dict)
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.UPLOAD,
    )
    original_filename = models.CharField(max_length=255, blank=True)
    storage_key = models.CharField(max_length=512, blank=True)
    url = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    extracted_data = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="design_bank_sources",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.source_type}: {self.original_filename or self.url or self.pk}"
