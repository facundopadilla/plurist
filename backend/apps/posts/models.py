# pyright: reportArgumentType=false, reportAttributeAccessIssue=false

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.accounts.models import Membership, RoleChoices, Workspace


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
        PENDING_APPROVAL = "pending_approval", "Pending approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PUBLISHING = "publishing", "Publishing"
        PUBLISHED = "published", "Published"
        FAILED = "failed", "Failed"

    MATERIAL_FIELDS = {
        "body_text",
        "selected_variant",
        "target_networks",
        "render_asset_key",
        "brand_profile_version",
        "template_definition",
        "selected_variant_id",
        "brand_profile_version_id",
        "template_definition_id",
    }

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="draft_posts",
    )
    title = models.CharField(max_length=255)
    body_text = models.TextField(blank=True)
    target_networks = models.JSONField(default=list, blank=True)
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
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    failure_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._loaded_status = self.status
        self._loaded_material_snapshot = self._material_snapshot()

    def _material_snapshot(self):
        return {
            "body_text": self.body_text,
            "selected_variant_id": self.selected_variant_id,
            "target_networks": list(self.target_networks or []),
            "render_asset_key": self.render_asset_key,
            "brand_profile_version_id": self.brand_profile_version_id,
            "template_definition_id": self.template_definition_id,
        }

    def _membership_role(self, user):
        membership = Membership.objects.filter(
            user=user,
            workspace=self.workspace,
        ).first()
        return membership.role if membership else None

    def _ensure_role(self, user, allowed_roles):
        role = self._membership_role(user)
        if role not in allowed_roles:
            raise PermissionError("User role is not allowed for this transition")

    def _ensure_content_valid_for_submission(self):
        if not self.body_text.strip() and not self.render_asset_key.strip():
            raise ValidationError(
                "Draft must include text or render asset before submit"
            )

    def _invalidate_approval_if_needed(self):
        if self._loaded_status not in {
            self.Status.APPROVED,
            self.Status.PENDING_APPROVAL,
        }:
            return False

        previous = self._loaded_material_snapshot
        current = self._material_snapshot()
        if previous == current:
            return False

        self.status = self.Status.DRAFT
        self.submitted_at = None
        self.approved_at = None

        from apps.approvals.models import ApprovalDecision

        ApprovalDecision.objects.filter(
            draft_post=self,
            invalidated=False,
        ).update(invalidated=True)
        return True

    def save(self, *args, **kwargs):
        invalidated = self._invalidate_approval_if_needed()
        if (
            invalidated
            and "update_fields" in kwargs
            and kwargs["update_fields"] is not None
        ):
            update_fields = set(kwargs["update_fields"])
            update_fields.update({"status", "submitted_at", "approved_at"})
            kwargs["update_fields"] = list(update_fields)
        super().save(*args, **kwargs)
        self._loaded_status = self.status
        self._loaded_material_snapshot = self._material_snapshot()

    def submit_for_approval(self, actor):
        self._ensure_role(actor, {RoleChoices.EDITOR, RoleChoices.OWNER})
        if self.status != self.Status.DRAFT:
            raise ValidationError("Only drafts can be submitted")
        self._ensure_content_valid_for_submission()
        self.status = self.Status.PENDING_APPROVAL
        self.submitted_at = timezone.now()
        self.save(update_fields=["status", "submitted_at", "updated_at"])

    def approve(self, actor, reason=""):
        self._ensure_role(actor, {RoleChoices.OWNER})
        if self.status != self.Status.PENDING_APPROVAL:
            raise ValidationError("Only pending approvals can be approved")

        from apps.approvals.models import ApprovalDecision, ApprovedSnapshot

        decision = ApprovalDecision.objects.create(
            draft_post=self,
            decided_by=actor,
            decision=ApprovalDecision.Decision.APPROVED,
            reason=reason,
        )

        snapshot = {
            "draft_post_id": self.pk,
            "title": self.title,
            "body_text": self.body_text,
            "target_networks": self.target_networks,
            "render_asset_key": self.render_asset_key,
            "selected_variant_id": self.selected_variant_id,
            "brand_profile_version_id": self.brand_profile_version_id,
            "template_definition_id": self.template_definition_id,
        }
        ApprovedSnapshot.objects.update_or_create(
            draft_post=self,
            defaults={
                "approval_decision": decision,
                "snapshot_data": snapshot,
            },
        )

        self.status = self.Status.APPROVED
        self.approved_at = timezone.now()
        self.save(update_fields=["status", "approved_at", "updated_at"])

    def reject(self, actor, reason=""):
        self._ensure_role(actor, {RoleChoices.OWNER})
        if self.status != self.Status.PENDING_APPROVAL:
            raise ValidationError("Only pending approvals can be rejected")

        from apps.approvals.models import ApprovalDecision

        ApprovalDecision.objects.create(
            draft_post=self,
            decided_by=actor,
            decision=ApprovalDecision.Decision.REJECTED,
            reason=reason,
        )

        self.status = self.Status.REJECTED
        self.save(update_fields=["status", "updated_at"])

    def reset_to_draft(self, actor):
        self._ensure_role(actor, {RoleChoices.EDITOR, RoleChoices.OWNER})
        if self.status != self.Status.REJECTED:
            raise ValidationError("Only rejected posts can be reset")
        self.status = self.Status.DRAFT
        self.save(update_fields=["status", "updated_at"])

    def start_publishing(self, actor):
        self._ensure_role(actor, {RoleChoices.PUBLISHER, RoleChoices.OWNER})
        if self.status != self.Status.APPROVED:
            raise ValidationError("Only approved posts can start publishing")
        self.status = self.Status.PUBLISHING
        self.save(update_fields=["status", "updated_at"])

    def mark_published(self):
        if self.status != self.Status.PUBLISHING:
            raise ValidationError("Only publishing posts can become published")
        self.status = self.Status.PUBLISHED
        self.published_at = timezone.now()
        self.failure_message = ""
        self.save(
            update_fields=["status", "published_at", "failure_message", "updated_at"]
        )

    def mark_failed(self, message):
        if self.status != self.Status.PUBLISHING:
            raise ValidationError("Only publishing posts can fail")
        self.status = self.Status.FAILED
        self.failure_message = message
        self.save(update_fields=["status", "failure_message", "updated_at"])


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
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
