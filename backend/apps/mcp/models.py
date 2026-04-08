import hashlib
import secrets

from django.conf import settings
from django.db import models

from apps.accounts.models import RoleChoices, Workspace


class WorkspaceAPIKey(models.Model):
    """API key for authenticating AI agents and server-to-server integrations."""

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    name = models.CharField(max_length=255, help_text="Human label, e.g. 'Claude Desktop'")
    prefix = models.CharField(max_length=8, db_index=True, help_text="First 8 chars for identification")
    key_hash = models.CharField(max_length=64, unique=True, help_text="SHA-256 of the full key")
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.EDITOR,
        help_text="Permissions level inherited by this key",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_api_keys",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"

    @staticmethod
    def hash_key(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode()).hexdigest()

    @classmethod
    def create_key(
        cls,
        workspace: Workspace,
        name: str,
        role: str = RoleChoices.EDITOR,
        created_by=None,
    ) -> tuple["WorkspaceAPIKey", str]:
        """Create a new API key. Returns (instance, raw_key).

        The raw key is returned exactly once — it is NOT stored.
        """
        raw_key = f"sk-{secrets.token_hex(32)}"
        instance = cls.objects.create(
            workspace=workspace,
            name=name,
            prefix=raw_key[:8],
            key_hash=cls.hash_key(raw_key),
            role=role,
            created_by=created_by,
        )
        return instance, raw_key
