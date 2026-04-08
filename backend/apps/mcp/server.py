"""Plurist MCP Server factory.

Creates and configures a FastMCP instance with all tools, resources, and prompts.
Tools are registered via imports from the tools/ package.
"""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP


def create_mcp_server() -> FastMCP:
    """Create and configure the Plurist MCP server.

    Returns a FastMCP instance with all tools, resources, and prompts registered.
    Stateless HTTP mode is used for optimal scalability.
    """
    mcp = FastMCP(
        "Plurist",
        instructions=(
            "Plurist MCP Server — manage projects, create visual content, "
            "generate AI designs, and access design assets for social media."
        ),
        json_response=True,
        stateless_http=True,
    )

    _register_tools(mcp)
    _register_resources(mcp)
    _register_prompts(mcp)

    return mcp


def _register_tools(mcp: FastMCP) -> None:
    """Register all MCP tools."""
    from apps.mcp.tools.content import register_content_tools
    from apps.mcp.tools.design_bank import register_design_bank_tools
    from apps.mcp.tools.generation import register_generation_tools
    from apps.mcp.tools.projects import register_project_tools
    from apps.mcp.tools.skills import register_skills_tools

    @mcp.tool()
    def ping() -> str:
        """Health check — returns 'pong' if the server is running."""
        return "pong"

    register_project_tools(mcp)
    register_content_tools(mcp)
    register_generation_tools(mcp)
    register_design_bank_tools(mcp)
    register_skills_tools(mcp)


def _register_resources(mcp: FastMCP) -> None:
    """Register all MCP resources."""
    from apps.mcp.resources import register_resources

    register_resources(mcp)


def _register_prompts(mcp: FastMCP) -> None:
    """Register all MCP prompts."""
    from apps.mcp.prompts import register_prompts

    register_prompts(mcp)
