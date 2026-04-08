"""MCP tools for Content (DraftPost) management."""

from __future__ import annotations

from asgiref.sync import sync_to_async
from mcp.server.fastmcp import FastMCP

from apps.accounts.models import User, Workspace
from apps.posts.models import DraftPost


async def _get_mcp_system_user() -> User:
    """Get or create a system user for MCP-initiated operations.

    DraftPost.created_by is NOT NULL, so MCP tools need a user.
    This creates a dedicated system user that is not tied to any real person.
    """

    def _get_or_create():
        user, _ = User.objects.get_or_create(
            email="mcp-system@plurist.local",
            defaults={"name": "MCP System", "is_active": False},
        )
        return user

    return await sync_to_async(_get_or_create)()


def _post_to_dict(post: DraftPost, include_variants: bool = False) -> dict:
    """Serialize a DraftPost to a dict for MCP responses."""
    data = {
        "id": post.pk,
        "title": post.title,
        "body_text": post.body_text,
        "html_content": post.html_content,
        "global_styles": post.global_styles,
        "format": post.format,
        "status": post.status,
        "project_id": post.project_id,
        "render_asset_key": post.render_asset_key,
        "completed_at": post.completed_at.isoformat() if post.completed_at else None,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat(),
    }
    if include_variants:
        data["variants"] = [
            {
                "id": v.pk,
                "provider": v.provider,
                "model_id": v.model_id,
                "generated_html": v.generated_html,
                "generated_text": v.generated_text,
                "is_selected": v.is_selected,
                "slide_index": v.slide_index,
                "variant_type": v.variant_type,
                "created_at": v.created_at.isoformat(),
            }
            for v in post.variants.all().order_by("slide_index", "id")
        ]
        data["frame_metadata"] = [
            {
                "slide_index": f.slide_index,
                "name": f.name,
                "is_favorite": f.is_favorite,
            }
            for f in post.frame_metadata.all()
        ]
    return data


async def _get_content_post(
    content_id: int,
    *,
    include_related: bool = False,
) -> DraftPost | None:
    queryset = DraftPost.objects
    if include_related:
        queryset = queryset.prefetch_related("variants", "frame_metadata")
    try:
        return await sync_to_async(queryset.get)(pk=content_id, workspace_id=1)
    except DraftPost.DoesNotExist:
        return None


async def _list_content_tool(project_id: int | None = None) -> list[dict]:
    queryset = DraftPost.objects.filter(workspace_id=1)
    if project_id is not None:
        queryset = queryset.filter(project_id=project_id)
    queryset = queryset.order_by("-created_at")
    posts = await sync_to_async(list)(queryset)
    return [_post_to_dict(post) for post in posts]


async def _get_content_tool(content_id: int) -> dict:
    post = await _get_content_post(content_id, include_related=True)
    if post is None:
        return {"error": f"Content {content_id} not found"}
    return await sync_to_async(_post_to_dict)(post, include_variants=True)


async def _create_content_tool(
    title: str,
    html_content: str = "",
    global_styles: str = "",
    body_text: str = "",
    project_id: int | None = None,
    format: str = "ig_square",
) -> dict:
    workspace = await sync_to_async(Workspace.objects.first)()
    if not workspace:
        return {"error": "Workspace not bootstrapped"}

    post_kwargs = {
        "workspace": workspace,
        "created_by": await _get_mcp_system_user(),
        "title": title,
        "html_content": html_content,
        "global_styles": global_styles,
        "body_text": body_text,
        "format": format,
    }
    if project_id is not None:
        post_kwargs["project_id"] = project_id

    post = await sync_to_async(DraftPost.objects.create)(**post_kwargs)
    return _post_to_dict(post)


def _apply_content_updates(
    post: DraftPost,
    *,
    title: str | None = None,
    html_content: str | None = None,
    global_styles: str | None = None,
    body_text: str | None = None,
    format: str | None = None,
    project_id: int | None = None,
) -> list[str]:
    update_fields = ["updated_at"]
    if title is not None:
        post.title = title
        update_fields.append("title")
    if html_content is not None:
        post.html_content = html_content
        update_fields.append("html_content")
    if global_styles is not None:
        post.global_styles = global_styles
        update_fields.append("global_styles")
    if body_text is not None:
        post.body_text = body_text
        update_fields.append("body_text")
    if format is not None:
        post.format = format
        update_fields.append("format")
    if project_id is not None:
        post.project_id = project_id
        update_fields.append("project")
    return update_fields


async def _update_content_tool(
    content_id: int,
    *,
    title: str | None = None,
    html_content: str | None = None,
    global_styles: str | None = None,
    body_text: str | None = None,
    format: str | None = None,
    project_id: int | None = None,
) -> dict:
    post = await _get_content_post(content_id)
    if post is None:
        return {"error": f"Content {content_id} not found"}

    update_fields = _apply_content_updates(
        post,
        title=title,
        html_content=html_content,
        global_styles=global_styles,
        body_text=body_text,
        format=format,
        project_id=project_id,
    )
    await sync_to_async(post.save)(update_fields=update_fields)
    return _post_to_dict(post)


async def _call_post_transition(
    content_id: int,
    transition_name: str,
) -> dict:
    post = await _get_content_post(content_id)
    if post is None:
        return {"error": f"Content {content_id} not found"}

    try:
        await sync_to_async(getattr(post, transition_name))()
    except Exception as exc:
        return {"error": str(exc)}
    return _post_to_dict(post)


async def _delete_content_tool(content_id: int) -> dict:
    post = await _get_content_post(content_id)
    if post is None:
        return {"error": f"Content {content_id} not found"}

    post_title = post.title
    await sync_to_async(post.delete)()
    return {"ok": True, "deleted": post_title}


def register_content_tools(mcp: FastMCP) -> None:
    """Register all content-related MCP tools."""

    @mcp.tool()
    async def list_content(project_id: int | None = None) -> list[dict]:
        """List all content items (drafts) in the workspace.

        Args:
            project_id: Optional filter by project ID.

        Returns a list of content items with their metadata.
        Use get_content for full details including variants.
        """
        return await _list_content_tool(project_id)

    @mcp.tool()
    async def get_content(content_id: int) -> dict:
        """Get detailed information about a content item, including its variants.

        Args:
            content_id: The ID of the content item to retrieve.

        Returns full content details including HTML, variants, and frame metadata.
        """
        return await _get_content_tool(content_id)

    @mcp.tool()
    async def create_content(
        title: str,
        html_content: str = "",
        global_styles: str = "",
        body_text: str = "",
        project_id: int | None = None,
        format: str = "ig_square",
    ) -> dict:
        """Create a new content item (draft).

        Args:
            title: The content title.
            html_content: HTML content for the visual design.
            global_styles: Global CSS styles applied to all slides.
            body_text: Plain text body (optional).
            project_id: Associate with a project (optional).
            format: Content format — ig_square, ig_portrait, ig_story, etc. (default: ig_square).

        Returns the created content item with its ID.
        """
        return await _create_content_tool(
            title=title,
            html_content=html_content,
            global_styles=global_styles,
            body_text=body_text,
            project_id=project_id,
            format=format,
        )

    @mcp.tool()
    async def update_content(
        content_id: int,
        title: str | None = None,
        html_content: str | None = None,
        global_styles: str | None = None,
        body_text: str | None = None,
        format: str | None = None,
        project_id: int | None = None,
    ) -> dict:
        """Update an existing content item's fields.

        Args:
            content_id: The ID of the content to update.
            title: New title (optional).
            html_content: New HTML content (optional).
            global_styles: New global CSS styles (optional).
            body_text: New body text (optional).
            format: New format (optional).
            project_id: New project association (optional).

        Only provided fields are updated.
        """
        return await _update_content_tool(
            content_id,
            title=title,
            html_content=html_content,
            global_styles=global_styles,
            body_text=body_text,
            format=format,
            project_id=project_id,
        )

    @mcp.tool()
    async def complete_content(content_id: int) -> dict:
        """Mark a draft content item as completed.

        Args:
            content_id: The ID of the content to complete.

        The content must be in 'draft' status and have text, render asset, or HTML content.
        """
        return await _call_post_transition(content_id, "mark_completed")

    @mcp.tool()
    async def revert_content(content_id: int) -> dict:
        """Revert a completed content item back to draft status.

        Args:
            content_id: The ID of the content to revert.

        The content must be in 'completed' status.
        """
        return await _call_post_transition(content_id, "revert_to_draft")

    @mcp.tool()
    async def delete_content(content_id: int) -> dict:
        """Permanently delete a content item and all its variants.

        Args:
            content_id: The ID of the content to delete.

        Warning: This action is irreversible.
        """
        return await _delete_content_tool(content_id)
