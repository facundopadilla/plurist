"""Tests for MCP design bank and skills tools."""

import pytest

from apps.mcp.server import create_mcp_server


@pytest.fixture
def mcp_server():
    return create_mcp_server()


class TestDesignBankToolsRegistered:
    def test_all_design_bank_tools(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        expected = ["list_design_sources", "get_design_source", "upload_design_source"]
        for tool_name in expected:
            assert tool_name in names, f"Missing tool: {tool_name}"

    def test_upload_description_mentions_file_limitation(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        tool = next(t for t in tools if t.name == "upload_design_source")
        assert "file" in tool.description.lower()


class TestSkillsToolsRegistered:
    def test_all_skills_tools(self, mcp_server):
        tools = mcp_server._tool_manager.list_tools()
        names = [t.name for t in tools]
        expected = ["list_available_skills", "install_skill", "list_project_skills", "toggle_skill"]
        for tool_name in expected:
            assert tool_name in names, f"Missing tool: {tool_name}"


class TestTotalToolCount:
    def test_total_registered_tools(self, mcp_server):
        """Verify the total number of registered tools."""
        tools = mcp_server._tool_manager.list_tools()
        assert len(tools) == 24, f"Expected 24 tools, got {len(tools)}: {[t.name for t in tools]}"
