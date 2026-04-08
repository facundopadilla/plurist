"""MCP tools for Project management."""

from __future__ import annotations

from asgiref.sync import sync_to_async
from mcp.server.fastmcp import FastMCP

from apps.accounts.models import Workspace
from apps.projects.models import Project


def register_project_tools(mcp: FastMCP) -> None:
    """Register all project-related MCP tools."""

    @mcp.tool()
    async def list_projects() -> list[dict]:
        """List all projects in the workspace.

        Returns a list of projects with their id, name, description, tags, color,
        and timestamps. Use this to discover available projects before working
        with content or design assets.
        """
        projects = await sync_to_async(list)(
            Project.objects.filter(workspace_id=1)
            .values("id", "name", "description", "tags", "color", "created_at", "updated_at")
            .order_by("-created_at")
        )
        return [
            {
                **p,
                "created_at": p["created_at"].isoformat(),
                "updated_at": p["updated_at"].isoformat(),
            }
            for p in projects
        ]

    @mcp.tool()
    async def get_project(project_id: int) -> dict:
        """Get detailed information about a specific project.

        Args:
            project_id: The ID of the project to retrieve.

        Returns project details including name, description, tags, color, and timestamps.
        Raises an error if the project is not found.
        """
        try:
            project = await sync_to_async(
                Project.objects.values("id", "name", "description", "tags", "color", "created_at", "updated_at").get
            )(pk=project_id, workspace_id=1)
        except Project.DoesNotExist:
            return {"error": f"Project {project_id} not found"}

        return {
            **project,
            "created_at": project["created_at"].isoformat(),
            "updated_at": project["updated_at"].isoformat(),
        }

    @mcp.tool()
    async def create_project(
        name: str,
        description: str = "",
        color: str = "#6366f1",
    ) -> dict:
        """Create a new project in the workspace.

        Args:
            name: The project name.
            description: Optional project description.
            color: Hex color for the project (default: #6366f1).

        Returns the created project with its assigned ID.
        """
        workspace = await sync_to_async(Workspace.objects.first)()
        if not workspace:
            return {"error": "Workspace not bootstrapped"}

        project = await sync_to_async(Project.objects.create)(
            workspace=workspace,
            name=name,
            description=description,
            color=color,
        )

        return {
            "id": project.pk,
            "name": project.name,
            "description": project.description,
            "color": project.color,
            "created_at": project.created_at.isoformat(),
        }

    @mcp.tool()
    async def update_project(
        project_id: int,
        name: str | None = None,
        description: str | None = None,
        color: str | None = None,
    ) -> dict:
        """Update an existing project's fields.

        Args:
            project_id: The ID of the project to update.
            name: New name (optional).
            description: New description (optional).
            color: New hex color (optional).

        Only provided fields are updated; others remain unchanged.
        """
        try:
            project = await sync_to_async(Project.objects.get)(pk=project_id, workspace_id=1)
        except Project.DoesNotExist:
            return {"error": f"Project {project_id} not found"}

        update_fields = ["updated_at"]
        if name is not None:
            project.name = name
            update_fields.append("name")
        if description is not None:
            project.description = description
            update_fields.append("description")
        if color is not None:
            project.color = color
            update_fields.append("color")

        await sync_to_async(project.save)(update_fields=update_fields)

        return {
            "id": project.pk,
            "name": project.name,
            "description": project.description,
            "color": project.color,
            "updated_at": project.updated_at.isoformat(),
        }

    @mcp.tool()
    async def delete_project(project_id: int) -> dict:
        """Permanently delete a project and its design bank sources.

        Args:
            project_id: The ID of the project to delete.

        Warning: This action is irreversible. Content (posts) associated with the
        project will NOT be deleted — they will become unlinked.
        """
        try:
            project = await sync_to_async(Project.objects.get)(pk=project_id, workspace_id=1)
        except Project.DoesNotExist:
            return {"error": f"Project {project_id} not found"}

        project_name = project.name
        await sync_to_async(project.delete)()

        return {"ok": True, "deleted": project_name}
