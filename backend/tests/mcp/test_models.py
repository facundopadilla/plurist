import pytest

from apps.accounts.models import RoleChoices
from apps.mcp.models import WorkspaceAPIKey
from tests.accounts.factories import UserFactory, WorkspaceFactory


@pytest.mark.django_db
class TestWorkspaceAPIKey:
    def test_create_key_returns_instance_and_raw_key(self):
        workspace = WorkspaceFactory()
        user = UserFactory()

        instance, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Test Key",
            role=RoleChoices.EDITOR,
            created_by=user,
        )

        assert instance.pk is not None
        assert raw_key.startswith("sk-")
        assert len(raw_key) == 67  # "sk-" + 64 hex chars

    def test_key_hash_is_stored_not_raw_key(self):
        workspace = WorkspaceFactory()
        instance, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Test Key",
        )

        assert instance.key_hash == WorkspaceAPIKey.hash_key(raw_key)
        assert raw_key not in instance.key_hash

    def test_prefix_is_first_8_chars(self):
        workspace = WorkspaceFactory()
        instance, raw_key = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Test Key",
        )

        assert instance.prefix == raw_key[:8]

    def test_default_role_is_editor(self):
        workspace = WorkspaceFactory()
        instance, _ = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Test Key",
        )

        assert instance.role == RoleChoices.EDITOR

    def test_str_representation(self):
        workspace = WorkspaceFactory()
        instance, _ = WorkspaceAPIKey.create_key(
            workspace=workspace,
            name="Claude Desktop",
        )

        assert "Claude Desktop" in str(instance)
        assert instance.prefix in str(instance)

    def test_hash_key_is_deterministic(self):
        key = "sk-abc123"
        assert WorkspaceAPIKey.hash_key(key) == WorkspaceAPIKey.hash_key(key)

    def test_hash_key_differs_for_different_keys(self):
        assert WorkspaceAPIKey.hash_key("sk-aaa") != WorkspaceAPIKey.hash_key("sk-bbb")
