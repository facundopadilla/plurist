from apps.mcp.server import create_mcp_server


class TestCreateMcpServer:
    def test_creates_server_instance(self):
        mcp = create_mcp_server()
        assert mcp is not None
        assert mcp.name == "Plurist"

    def test_server_has_ping_tool(self):
        mcp = create_mcp_server()
        # FastMCP stores tools internally — verify ping is registered
        tools = mcp._tool_manager.list_tools()
        tool_names = [t.name for t in tools]
        assert "ping" in tool_names

    def test_ping_tool_has_correct_description(self):
        mcp = create_mcp_server()
        tools = mcp._tool_manager.list_tools()
        ping_tool = next(t for t in tools if t.name == "ping")
        assert "health check" in ping_tool.description.lower()
