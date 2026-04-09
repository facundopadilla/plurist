"""MCP tools for AI Generation (CompareRun, providers)."""

from __future__ import annotations

from typing import Any

from asgiref.sync import sync_to_async
from mcp.server.fastmcp import FastMCP

from apps.accounts.models import Workspace
from apps.generation.models import CompareRun
from apps.generation.providers.registry import list_providers as list_generation_providers
from apps.generation.tasks import run_compare_task
from apps.posts.models import CarouselSlide, DraftPost, DraftVariant


def _compare_run_to_dict(cr: CompareRun, include_variants: bool = False) -> dict[str, Any]:
    """Serialize a CompareRun to a dict for MCP responses."""
    data: dict[str, Any] = {
        "id": cr.pk,
        "campaign_brief": cr.campaign_brief,
        "template_key": cr.template_key,
        "target_network": cr.target_network,
        "providers": cr.providers,
        "status": cr.status,
        "format": cr.format or "ig_square",
        "slide_count": cr.slide_count,
        "width": cr.width,
        "height": cr.height,
        "created_at": cr.created_at.isoformat(),
        "variants": [],
    }
    if include_variants:
        draft_post = DraftPost.objects.filter(
            workspace=cr.workspace,
            title=f"compare-run-{cr.pk}",
        ).first()
        if draft_post:
            data["variants"] = [
                {
                    "id": v.pk,
                    "provider": v.provider,
                    "model_id": v.model_id,
                    "generated_html": v.generated_html,
                    "generated_text": v.generated_text,
                    "is_selected": v.is_selected,
                    "slide_index": v.slide_index,
                    "created_at": v.created_at.isoformat(),
                }
                for v in draft_post.variants.all().order_by("slide_index", "id")
            ]
    return data


def _build_compare_run_kwargs(
    workspace: Workspace,
    campaign_brief: str,
    providers: list[str],
    project_id: int | None,
    format: str,
    slide_count: int | None,
    width: int,
    height: int,
    target_network: str,
    template_key: str,
) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "workspace": workspace,
        "campaign_brief": campaign_brief,
        "providers": providers,
        "format": format,
        "width": width,
        "height": height,
        "target_network": target_network,
        "template_key": template_key,
    }
    if slide_count is not None:
        kwargs["slide_count"] = slide_count
    if project_id is not None:
        kwargs["project_id"] = project_id
    return kwargs


async def _start_compare_tool(
    campaign_brief: str,
    providers: list[str],
    project_id: int | None = None,
    format: str = "ig_square",
    slide_count: int | None = None,
    width: int = 1080,
    height: int = 1080,
    target_network: str = "",
    template_key: str = "",
) -> dict[str, Any]:
    workspace = await sync_to_async(Workspace.objects.first)()
    if not workspace:
        return {"error": "Workspace not bootstrapped"}

    compare_run = await sync_to_async(CompareRun.objects.create)(
        **_build_compare_run_kwargs(
            workspace,
            campaign_brief,
            providers,
            project_id,
            format,
            slide_count,
            width,
            height,
            target_network,
            template_key,
        )
    )

    run_compare_task.delay(compare_run.id)
    return _compare_run_to_dict(compare_run)


async def _get_generation_status_tool(run_id: int) -> dict[str, Any]:
    try:
        compare_run = await sync_to_async(CompareRun.objects.get)(pk=run_id, workspace_id=1)
    except CompareRun.DoesNotExist:
        return {"error": f"Generation run {run_id} not found"}

    return await sync_to_async(_compare_run_to_dict)(compare_run, include_variants=True)


def _select_variant_sync(compare_run: CompareRun, variant_id: int, slide_index: int) -> dict[str, Any]:
    draft_post = DraftPost.objects.filter(
        workspace=compare_run.workspace,
        title=f"compare-run-{compare_run.pk}",
    ).first()
    if not draft_post:
        return {"error": "No variants found for this run"}

    try:
        variant = draft_post.variants.get(pk=variant_id)
    except DraftVariant.DoesNotExist:
        return {"error": f"Variant {variant_id} not found"}

    if variant.slide_index is not None and variant.slide_index != slide_index:
        return {"error": "slide_index does not match variant"}

    CarouselSlide.objects.update_or_create(
        draft_post=draft_post,
        slide_index=slide_index,
        defaults={"selected_variant": variant},
    )

    if slide_index == 0:
        draft_post.variants.filter(slide_index=0).update(is_selected=False)
        variant.is_selected = True
        variant.save(update_fields=["is_selected"])
        draft_post.selected_variant = variant
        draft_post.save(update_fields=["selected_variant", "updated_at"])

    return {"ok": True, "variant_id": variant.pk, "slide_index": slide_index}


async def _select_variant_tool(
    run_id: int,
    variant_id: int,
    slide_index: int = 0,
) -> dict[str, Any]:
    try:
        compare_run = await sync_to_async(CompareRun.objects.get)(pk=run_id, workspace_id=1)
    except CompareRun.DoesNotExist:
        return {"error": f"Generation run {run_id} not found"}

    return await sync_to_async(_select_variant_sync)(compare_run, variant_id, slide_index)


def register_generation_tools(mcp: FastMCP) -> None:
    """Register all generation-related MCP tools."""

    @mcp.tool()
    async def list_providers() -> list[str]:
        """List all available AI generation provider keys.

        Returns a list of provider identifiers that can be used with start_compare.
        Examples: 'openai', 'anthropic', 'ollama', etc.
        """
        return await sync_to_async(list_generation_providers)()

    @mcp.tool()
    async def start_compare(
        campaign_brief: str,
        providers: list[str],
        project_id: int | None = None,
        format: str = "ig_square",
        slide_count: int | None = None,
        width: int = 1080,
        height: int = 1080,
        target_network: str = "",
        template_key: str = "",
    ) -> dict:
        """Start an AI content generation run across multiple providers.

        This is an async operation — it returns immediately with a run ID.
        Use get_generation_status to poll for results.

        Args:
            campaign_brief: The creative brief describing what to generate.
            providers: List of provider keys to generate with (e.g. ['openai', 'anthropic']).
            project_id: Optional project to associate the generation with.
            format: Output format — ig_square, ig_portrait, ig_story, etc.
            slide_count: Number of slides for carousel content (optional).
            width: Output width in pixels (default: 1080).
            height: Output height in pixels (default: 1080).
            target_network: Target social network (e.g. 'instagram', 'linkedin').
            template_key: Template key for structured generation (optional).

        Returns the compare run with its ID and 'pending' status.
        """
        return await _start_compare_tool(
            campaign_brief=campaign_brief,
            providers=providers,
            project_id=project_id,
            format=format,
            slide_count=slide_count,
            width=width,
            height=height,
            target_network=target_network,
            template_key=template_key,
        )

    @mcp.tool()
    async def get_generation_status(run_id: int) -> dict:
        """Get the status and results of an AI generation run.

        Args:
            run_id: The ID returned by start_compare.

        Returns the current status ('pending', 'running', 'completed', 'partial_failure')
        and, if completed, the generated variants with their HTML content.

        Poll this endpoint periodically until status is 'completed'.
        """
        return await _get_generation_status_tool(run_id)

    @mcp.tool()
    async def select_variant(
        run_id: int,
        variant_id: int,
        slide_index: int = 0,
    ) -> dict:
        """Select a specific variant from a completed generation run.

        Args:
            run_id: The compare run ID.
            variant_id: The variant ID to select.
            slide_index: Which slide this variant is for (default: 0 for single-slide).

        This marks the variant as selected and updates the associated draft post.
        """
        return await _select_variant_tool(run_id, variant_id, slide_index)
