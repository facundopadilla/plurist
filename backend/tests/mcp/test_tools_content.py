"""Tests for MCP content tools."""

import pytest

from apps.mcp.server import create_mcp_server
from apps.posts.models import DraftPost
from tests.accounts.factories import UserFactory, WorkspaceFactory


@pytest.fixture
def workspace():
    return WorkspaceFactory()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def mcp_server():
    return create_mcp_server()


class TestAllContentToolsRegistered:
    def test_all_seven_content_tools(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        expected = [
            "list_content",
            "get_content",
            "create_content",
            "update_content",
            "complete_content",
            "revert_content",
            "delete_content",
        ]
        for tool_name in expected:
            assert tool_name in names, f"Missing tool: {tool_name}"


@pytest.mark.django_db
class TestContentToolDescriptions:
    def test_list_content_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "list_content")
        assert "content" in tool.description.lower()

    def test_create_content_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "create_content")
        assert "create" in tool.description.lower()

    def test_complete_content_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "complete_content")
        assert "completed" in tool.description.lower()

    def test_delete_content_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "delete_content")
        assert "delete" in tool.description.lower()


@pytest.mark.django_db
class TestContentORMOperations:
    def test_create_draft_post(self, workspace, user):
        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=user,
            title="MCP Draft",
            html_content="<div>Hello</div>",
            format="ig_square",
        )
        assert post.pk is not None
        assert post.status == "draft"

    def test_complete_and_revert(self, workspace, user):
        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=user,
            title="Lifecycle Test",
            html_content="<div>Content</div>",
        )
        post.mark_completed()
        assert post.status == "completed"
        assert post.completed_at is not None

        post.revert_to_draft()
        assert post.status == "draft"
        assert post.completed_at is None

    def test_delete_draft_post(self, workspace, user):
        post = DraftPost.objects.create(
            workspace=workspace,
            created_by=user,
            title="To Delete",
            html_content="<div>Gone</div>",
        )
        post_id = post.pk
        post.delete()
        assert not DraftPost.objects.filter(pk=post_id).exists()
