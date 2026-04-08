from __future__ import annotations

from dataclasses import dataclass, field

from django.utils import timezone

from apps.accounts.models import RoleChoices, Workspace

from .models import WorkspaceAPIKey


class APIKeyAuthError(Exception):
    """Raised when API key authentication fails."""


@dataclass
class VirtualMembership:
    """Mimics the Membership interface for API key auth.

    Allows existing permission guards (require_owner, require_editor_capabilities)
    to work transparently with API key authentication.
    """

    workspace: Workspace
    role: str
    user: None = field(default=None, repr=False)

    @property
    def is_owner(self) -> bool:
        return self.role == RoleChoices.OWNER

    @property
    def is_editor(self) -> bool:
        return self.role in (RoleChoices.OWNER, RoleChoices.EDITOR)


def authenticate_api_key(raw_key: str) -> VirtualMembership:
    """Authenticate an API key and return a VirtualMembership.

    Raises APIKeyAuthError if the key is invalid, inactive, or not found.
    """
    if not raw_key or not raw_key.startswith("sk-"):
        raise APIKeyAuthError("Invalid API key format")

    key_hash = WorkspaceAPIKey.hash_key(raw_key)

    try:
        api_key = WorkspaceAPIKey.objects.select_related("workspace").get(
            key_hash=key_hash,
            is_active=True,
        )
    except WorkspaceAPIKey.DoesNotExist:
        raise APIKeyAuthError("Invalid or inactive API key")

    # Update last_used_at
    api_key.last_used_at = timezone.now()
    api_key.save(update_fields=["last_used_at"])

    return VirtualMembership(
        workspace=api_key.workspace,
        role=api_key.role,
    )


def extract_bearer_token(authorization_header: str | None) -> str | None:
    """Extract the token from an Authorization: Bearer header."""
    if not authorization_header:
        return None
    parts = authorization_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()
