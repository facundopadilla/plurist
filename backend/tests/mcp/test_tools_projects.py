"""Tests for MCP project tools."""

import pytest

from apps.mcp.server import create_mcp_server
from apps.projects.models import Project
from tests.accounts.factories import WorkspaceFactory


@pytest.fixture
def workspace():
    return WorkspaceFactory()


@pytest.fixture
def mcp_server():
    return create_mcp_server()


@pytest.mark.django_db
class TestListProjects:
    async def _call(self, mcp):
        return await mcp._tool_manager.call_tool("list_projects", {})

    def test_tool_registered(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        assert "list_projects" in names

    def test_list_projects_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "list_projects")
        assert "projects" in tool.description.lower()


@pytest.mark.django_db
class TestGetProject:
    def test_tool_registered(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        assert "get_project" in names


@pytest.mark.django_db
class TestCreateProject:
    def test_tool_registered(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        assert "create_project" in names

    def test_create_project_via_orm(self, workspace):
        """Verify the underlying ORM operation works correctly."""
        project = Project.objects.create(
            workspace=workspace,
            name="Test MCP Project",
            description="Created via test",
            color="#ff0000",
        )
        assert project.pk is not None
        assert project.name == "Test MCP Project"
        assert project.workspace == workspace


@pytest.mark.django_db
class TestUpdateProject:
    def test_tool_registered(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        assert "update_project" in names

    def test_update_project_via_orm(self, workspace):
        project = Project.objects.create(
            workspace=workspace,
            name="Original",
            color="#000000",
        )
        project.name = "Updated"
        project.save(update_fields=["name", "updated_at"])
        project.refresh_from_db()
        assert project.name == "Updated"


@pytest.mark.django_db
class TestDeleteProject:
    def test_tool_registered(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        assert "delete_project" in names

    def test_delete_project_via_orm(self, workspace):
        project = Project.objects.create(
            workspace=workspace,
            name="To Delete",
        )
        project_id = project.pk
        project.delete()
        assert not Project.objects.filter(pk=project_id).exists()


class TestAllProjectToolsRegistered:
    def test_all_five_project_tools(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        expected = ["list_projects", "get_project", "create_project", "update_project", "delete_project"]
        for tool_name in expected:
            assert tool_name in names, f"Missing tool: {tool_name}"
