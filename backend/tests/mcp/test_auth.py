import pytest

from apps.accounts.models import RoleChoices
from apps.mcp.auth import (
    APIKeyAuthError,
    VirtualMembership,
    authenticate_api_key,
    extract_bearer_token,
)
from apps.mcp.models import WorkspaceAPIKey
from tests.accounts.factories import WorkspaceFactory


@pytest.mark.django_db
class TestAuthenticateAPIKey:
    def test_valid_key_returns_virtual_membership(self):
        workspace = WorkspaceFactory()
        _, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Test",
            role=RoleChoices.EDITOR,
        )

        membership = authenticate_api_key(raw_key)

        assert isinstance(membership, VirtualMembership)
        assert membership.workspace == workspace
        assert membership.role == RoleChoices.EDITOR
        assert membership.user is None

    def test_owner_key_returns_owner_membership(self):
        workspace = WorkspaceFactory()
        _, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Owner Key",
            role=RoleChoices.OWNER,
        )

        membership = authenticate_api_key(raw_key)

        assert membership.role == RoleChoices.OWNER
        assert membership.is_owner is True
        assert membership.is_editor is True

    def test_editor_membership_properties(self):
        workspace = WorkspaceFactory()
        _, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Editor Key",
            role=RoleChoices.EDITOR,
        )

        membership = authenticate_api_key(raw_key)

        assert membership.is_owner is False
        assert membership.is_editor is True

    def test_publisher_membership_properties(self):
        workspace = WorkspaceFactory()
        _, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Publisher Key",
            role=RoleChoices.PUBLISHER,
        )

        membership = authenticate_api_key(raw_key)

        assert membership.is_owner is False
        assert membership.is_editor is False

    def test_invalid_key_raises(self):
        with pytest.raises(APIKeyAuthError, match="Invalid or inactive"):
            authenticate_api_key("sk-nonexistent000000000000000000000000000000000000000000000000000000")

    def test_empty_key_raises(self):
        with pytest.raises(APIKeyAuthError, match="Invalid API key format"):
            authenticate_api_key("")

    def test_wrong_prefix_raises(self):
        with pytest.raises(APIKeyAuthError, match="Invalid API key format"):
            authenticate_api_key("pk-wrong-prefix")

    def test_inactive_key_raises(self):
        workspace = WorkspaceFactory()
        instance, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Inactive",
        )
        instance.is_active = False
        instance.save(update_fields=["is_active"])

        with pytest.raises(APIKeyAuthError, match="Invalid or inactive"):
            authenticate_api_key(raw_key)

    def test_last_used_at_updated(self):
        workspace = WorkspaceFactory()
        instance, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Track Usage",
        )
        assert instance.last_used_at is None

        authenticate_api_key(raw_key)

        instance.refresh_from_db()
        assert instance.last_used_at is not None


class TestExtractBearerToken:
    def test_valid_bearer(self):
        assert extract_bearer_token("Bearer sk-abc123") == "sk-abc123"

    def test_case_insensitive(self):
        assert extract_bearer_token("bearer sk-abc123") == "sk-abc123"

    def test_none_header(self):
        assert extract_bearer_token(None) is None

    def test_empty_header(self):
        assert extract_bearer_token("") is None

    def test_no_bearer_prefix(self):
        assert extract_bearer_token("Token sk-abc123") is None

    def test_missing_token(self):
        assert extract_bearer_token("Bearer") is None

    def test_strips_whitespace(self):
        assert extract_bearer_token("Bearer  sk-abc123 ") == "sk-abc123"
