"""MCP tools for Design Bank management."""

from __future__ import annotations

from asgiref.sync import sync_to_async
from mcp.server.fastmcp import FastMCP

from apps.accounts.models import Workspace
from apps.design_bank.models import DesignBankSource


def _source_to_dict(source: DesignBankSource) -> dict:
    return {
        "id": source.pk,
        "name": source.name,
        "source_type": source.source_type,
        "status": source.status,
        "project_id": source.project_id,
        "original_filename": source.original_filename,
        "url": source.url,
        "resource_data": source.resource_data,
        "extracted_data": source.extracted_data,
        "created_at": source.created_at.isoformat(),
    }


def register_design_bank_tools(mcp: FastMCP) -> None:
    """Register all design bank-related MCP tools."""

    @mcp.tool()
    async def list_design_sources(project_id: int | None = None) -> list[dict]:
        """List design bank sources (logos, fonts, colors, CSS, etc.).

        Args:
            project_id: Filter by project ID (optional).

        Returns a list of design assets with their type, status, and metadata.
        """
        qs = DesignBankSource.objects.filter(workspace_id=1)
        if project_id is not None:
            qs = qs.filter(project_id=project_id)
        qs = qs.order_by("-created_at")

        sources = await sync_to_async(list)(qs)
        return [_source_to_dict(s) for s in sources]

    @mcp.tool()
    async def get_design_source(source_id: int) -> dict:
        """Get detailed information about a design bank source.

        Args:
            source_id: The ID of the design source to retrieve.

        Returns the full source details including extracted data and resource content.
        """
        try:
            source = await sync_to_async(DesignBankSource.objects.get)(pk=source_id, workspace_id=1)
        except DesignBankSource.DoesNotExist:
            return {"error": f"Design source {source_id} not found"}

        return _source_to_dict(source)

    @mcp.tool()
    async def upload_design_source(
        project_id: int,
        source_type: str,
        name: str = "",
        content: str = "",
        url: str = "",
    ) -> dict:
        """Upload a new design source to the design bank.

        Args:
            project_id: The project to add the source to.
            source_type: Type of source — 'color', 'font', 'css', 'text', 'html',
                         'url', 'logo', 'design_system', 'markdown'.
            name: Human-readable name for the source.
            content: Text/CSS/HTML content (for text-based types).
            url: URL to fetch content from (for 'url' type).

        Note: File uploads (images, PDFs) are not supported via MCP.
        Use the web UI for file-based assets.
        """
        workspace = await sync_to_async(Workspace.objects.first)()
        if not workspace:
            return {"error": "Workspace not bootstrapped"}

        valid_types = [c[0] for c in DesignBankSource.SourceType.choices]
        if source_type not in valid_types:
            return {"error": f"Invalid source_type. Must be one of: {valid_types}"}

        resource_data = {}
        if content:
            resource_data["content"] = content

        source = await sync_to_async(DesignBankSource.objects.create)(
            workspace=workspace,
            project_id=project_id,
            source_type=source_type,
            name=name or f"{source_type} source",
            url=url,
            resource_data=resource_data,
            status=DesignBankSource.Status.READY,
        )

        return _source_to_dict(source)
