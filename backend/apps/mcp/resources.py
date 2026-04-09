"""MCP Resources for Plurist.

Resources provide read-only data via URI patterns.
Agents use resources to discover and read workspace data.
"""

from __future__ import annotations

import json

from asgiref.sync import sync_to_async
from mcp.server.fastmcp import FastMCP

from apps.generation.providers.registry import list_providers
from apps.posts.models import DraftPost
from apps.projects.models import Project


def register_resources(mcp: FastMCP) -> None:
    """Register all MCP resources."""

    @mcp.resource("plurist://projects")
    async def list_projects_resource() -> str:
        """All projects in the workspace with their IDs, names, and colors."""
        projects = await sync_to_async(list)(
            Project.objects.filter(workspace_id=1).values("id", "name", "description", "color").order_by("-created_at")
        )
        return json.dumps(list(projects), indent=2)

    @mcp.resource("plurist://projects/{project_id}")
    async def get_project_resource(project_id: int) -> str:
        """Detailed project information including tags and timestamps."""
        try:
            project = await sync_to_async(
                Project.objects.values("id", "name", "description", "tags", "color", "created_at", "updated_at").get
            )(pk=project_id, workspace_id=1)
            project["created_at"] = project["created_at"].isoformat()
            project["updated_at"] = project["updated_at"].isoformat()
            return json.dumps(project, indent=2)
        except Project.DoesNotExist:
            return json.dumps({"error": f"Project {project_id} not found"})

    @mcp.resource("plurist://content/{content_id}")
    async def get_content_resource(content_id: int) -> str:
        """Content item with its HTML, variants, and metadata."""
        try:
            post = await sync_to_async(DraftPost.objects.prefetch_related("variants", "frame_metadata").get)(
                pk=content_id, workspace_id=1
            )

            data = {
                "id": post.pk,
                "title": post.title,
                "html_content": post.html_content,
                "global_styles": post.global_styles,
                "format": post.format,
                "status": post.status,
                "project_id": post.project_id,
                "variants": await sync_to_async(
                    lambda: [
                        {
                            "id": v.pk,
                            "provider": v.provider,
                            "generated_html": v.generated_html,
                            "is_selected": v.is_selected,
                            "slide_index": v.slide_index,
                        }
                        for v in post.variants.all().order_by("slide_index", "id")
                    ]
                )(),
            }
            return json.dumps(data, indent=2)
        except DraftPost.DoesNotExist:
            return json.dumps({"error": f"Content {content_id} not found"})

    @mcp.resource("plurist://providers")
    async def list_providers_resource() -> str:
        """Available AI generation providers."""
        providers = await sync_to_async(list_providers)()
        return json.dumps(providers, indent=2)
