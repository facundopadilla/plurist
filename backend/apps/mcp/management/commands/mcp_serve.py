"""Run the Plurist MCP server via Streamable HTTP transport.

Usage:
    python manage.py mcp_serve
    python manage.py mcp_serve --port 3001 --host 0.0.0.0

Designed for remote connections from AI agents over HTTP/SSE.
Runs as a separate process alongside the Django backend.
"""

from django.core.management.base import BaseCommand

from apps.mcp.server import create_mcp_server


class Command(BaseCommand):
    help = "Run the Plurist MCP server via Streamable HTTP transport"

    def add_arguments(self, parser):
        parser.add_argument(
            "--port",
            type=int,
            default=3001,
            help="Port to listen on (default: 3001)",
        )
        parser.add_argument(
            "--host",
            type=str,
            default="127.0.0.1",
            help="Host to bind to (default: 127.0.0.1)",
        )

    def handle(self, *args, **options):
        host = options["host"]
        port = options["port"]

        self.stdout.write(self.style.SUCCESS(f"Starting Plurist MCP server at http://{host}:{port}/mcp"))

        mcp = create_mcp_server()
        mcp.run(transport="streamable-http", host=host, port=port)
