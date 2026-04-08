"""Run the Plurist MCP server via stdio transport.

Usage:
    python manage.py mcp_stdio

Designed for local use with Claude Desktop, Cursor, Windsurf, etc.
No authentication required — the local user is trusted.

Claude Desktop config example (claude_desktop_config.json):
    {
        "mcpServers": {
            "plurist": {
                "command": "uv",
                "args": ["run", "--project", "/path/to/backend", "python", "manage.py", "mcp_stdio"]
            }
        }
    }
"""

from django.core.management.base import BaseCommand

from apps.mcp.server import create_mcp_server


class Command(BaseCommand):
    help = "Run the Plurist MCP server via stdio transport (for local AI agents)"

    def handle(self, *args, **options):
        mcp = create_mcp_server()
        mcp.run(transport="stdio")
