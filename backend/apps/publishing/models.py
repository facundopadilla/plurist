# pyright: reportArgumentType=false

from datetime import datetime
from datetime import timezone as dt_timezone

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.accounts.models import Workspace


class SocialConnection(models.Model):
    class Status(models.TextChoices):
        CONNECTED = "connected", "Connected"
        EXPIRED = "expired", "Expired"
        ERROR = "error", "Error"
        REVOKED = "revoked", "Revoked"

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    network = models.CharField(max_length=20)
    display_name = models.CharField(max_length=255)
    credentials_enc = models.TextField(blank=True)
    provider_user_id = models.CharField(max_length=255, blank=True)
    provider_username = models.CharField(max_length=255, blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONNECTED,
    )
    last_refreshed_at = models.DateTimeField(null=True, blank=True)
    error_detail = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="social_connections",
    )

    def set_tokens(self, data: dict) -> None:
        from apps.integrations.crypto import TokenVault

        self.credentials_enc = TokenVault.encrypt(data)
        expires_at = data.get("expires_at")
        if expires_at:
            self.token_expires_at = datetime.fromtimestamp(int(expires_at), tz=dt_timezone.utc)
        self.status = self.Status.CONNECTED
        self.last_refreshed_at = timezone.now()

    def get_tokens(self) -> dict:
        from apps.integrations.crypto import TokenVault

        if not self.credentials_enc:
            return {}
        return TokenVault.decrypt(self.credentials_enc)

    def is_token_expired(self) -> bool:
        if not self.token_expires_at:
            return False
        return timezone.now() >= self.token_expires_at

    def mark_expired(self) -> None:
        self.status = self.Status.EXPIRED

    def mark_error(self, detail: str = "") -> None:
        self.status = self.Status.ERROR
        self.error_detail = detail

    def mark_connected(self) -> None:
        self.status = self.Status.CONNECTED
        self.error_detail = ""


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
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    external_post_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    social_connection = models.ForeignKey(
        "publishing.SocialConnection",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="publish_attempts",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["draft_post", "idempotency_key", "network"],
                condition=~models.Q(idempotency_key=""),
                name="unique_publish_attempt_idempotency",
            ),
        ]


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
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scheduled_publications",
    )
