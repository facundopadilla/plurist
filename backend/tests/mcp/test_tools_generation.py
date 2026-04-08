"""Tests for MCP generation tools."""

import pytest

from apps.generation.models import CompareRun
from apps.mcp.server import create_mcp_server
from tests.accounts.factories import WorkspaceFactory


@pytest.fixture
def workspace():
    return WorkspaceFactory()


@pytest.fixture
def mcp_server():
    return create_mcp_server()


class TestAllGenerationToolsRegistered:
    def test_all_four_generation_tools(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        expected = ["list_providers", "start_compare", "get_generation_status", "select_variant"]
        for tool_name in expected:
            assert tool_name in names, f"Missing tool: {tool_name}"


class TestGenerationToolDescriptions:
    def test_start_compare_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "start_compare")
        assert "generation" in tool.description.lower() or "provider" in tool.description.lower()

    def test_get_generation_status_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "get_generation_status")
        assert "status" in tool.description.lower()

    def test_select_variant_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "select_variant")
        assert "variant" in tool.description.lower()

    def test_list_providers_description(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "list_providers")
        assert "provider" in tool.description.lower()


@pytest.mark.django_db
class TestCompareRunORM:
    def test_create_compare_run(self, workspace):
        cr = CompareRun.objects.create(
            workspace=workspace,
            campaign_brief="Test brief for Instagram",
            providers=["openai"],
            format="ig_square",
        )
        assert cr.pk is not None
        assert cr.status == "pending"
        assert cr.campaign_brief == "Test brief for Instagram"

    def test_compare_run_status_choices(self, workspace):
        cr = CompareRun.objects.create(
            workspace=workspace,
            campaign_brief="Test",
            providers=["openai"],
        )
        cr.status = CompareRun.Status.COMPLETED
        cr.save(update_fields=["status"])
        cr.refresh_from_db()
        assert cr.status == "completed"
