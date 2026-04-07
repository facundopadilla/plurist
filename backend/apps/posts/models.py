# pyright: reportArgumentType=false, reportAttributeAccessIssue=false

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.accounts.models import Workspace


class BrandProfileVersion(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    version = models.IntegerField()
    profile_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="brand_profile_versions",
    )

    class Meta:
        unique_together = [("workspace", "version")]


class TemplateDefinition(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    config = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DraftPost(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        COMPLETED = "completed", "Completed"

    MATERIAL_FIELDS = {
        "body_text",
        "selected_variant",
        "render_asset_key",
        "brand_profile_version",
        "template_definition",
        "selected_variant_id",
        "brand_profile_version_id",
        "template_definition_id",
        "html_content",
        "format",
        "project_id",
        "global_styles",
    }

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="draft_posts",
    )
    title = models.CharField(max_length=255)
    body_text = models.TextField(blank=True)
    brand_profile_version = models.ForeignKey(
        BrandProfileVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="draft_posts",
    )
    template_definition = models.ForeignKey(
        TemplateDefinition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="draft_posts",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    format = models.CharField(max_length=20, default="ig_square", blank=True)
    html_content = models.TextField(blank=True)
    global_styles = models.TextField(blank=True, default="")
    render_asset_key = models.CharField(max_length=255, blank=True)
    selected_variant = models.ForeignKey(
        "posts.DraftVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_in_posts",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._loaded_material_snapshot = self._material_snapshot()

    def _material_snapshot(self):
        return {
            "body_text": self.body_text,
            "selected_variant_id": self.selected_variant_id,
            "render_asset_key": self.render_asset_key,
            "brand_profile_version_id": self.brand_profile_version_id,
            "template_definition_id": self.template_definition_id,
            "html_content": self.html_content,
            "format": self.format,
            "project_id": self.project_id,
            "global_styles": self.global_styles,
        }

    def _ensure_content_valid(self):
        if not self.body_text.strip() and not self.render_asset_key.strip() and not self.html_content.strip():
            raise ValidationError("Draft must include text, render asset, or HTML content")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._loaded_material_snapshot = self._material_snapshot()

    def mark_completed(self):
        if self.status != self.Status.DRAFT:
            raise ValidationError("Only drafts can be marked as completed")
        self._ensure_content_valid()
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])

    def revert_to_draft(self):
        if self.status != self.Status.COMPLETED:
            raise ValidationError("Only completed content can revert to draft")
        self.status = self.Status.DRAFT
        self.completed_at = None
        self.save(update_fields=["status", "completed_at", "updated_at"])


class DraftVariant(models.Model):
    draft_post = models.ForeignKey(
        DraftPost,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    provider = models.CharField(max_length=50)
    model_id = models.CharField(max_length=100)
    prompt_text = models.TextField()
    generated_text = models.TextField()
    generated_html = models.TextField(blank=True)
    is_selected = models.BooleanField(default=False)
    slide_index = models.PositiveSmallIntegerField(null=True, blank=True)
    variant_type = models.CharField(max_length=20, default="default")
    derived_from_variant = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derived_variants",
    )
    generation_meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DraftFrameMetadata(models.Model):
    draft_post = models.ForeignKey(
        DraftPost,
        on_delete=models.CASCADE,
        related_name="frame_metadata",
    )
    slide_index = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=255, blank=True)
    is_favorite = models.BooleanField(default=False)
    annotations = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = [("draft_post", "slide_index")]
        ordering = ["slide_index"]


class CarouselSlide(models.Model):
    """Per-slide variant selection for carousel posts."""

    draft_post = models.ForeignKey(
        DraftPost,
        on_delete=models.CASCADE,
        related_name="carousel_slides",
    )
    slide_index = models.PositiveSmallIntegerField()
    selected_variant = models.ForeignKey(
        DraftVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carousel_selections",
    )

    class Meta:
        unique_together = [("draft_post", "slide_index")]
        ordering = ["slide_index"]
