from __future__ import annotations

import concurrent.futures
from typing import TYPE_CHECKING

from apps.posts.models import DraftPost, DraftVariant

from .models import CompareRun
from .providers.base import GenerationResult
from .providers.registry import get_provider

if TYPE_CHECKING:
    pass


def _build_prompt(compare_run: CompareRun) -> str:
    parts = [
        f"Template: {compare_run.template_key}",
        f"Campaign brief: {compare_run.campaign_brief}",
    ]
    if compare_run.target_network:
        parts.append(f"Target network: {compare_run.target_network}")
    if compare_run.brand_profile_version:
        bpv = compare_run.brand_profile_version
        parts.append(f"Brand profile: {bpv.profile_data}")
    parts.append("Generate a social media post based on the above.")
    return "\n".join(parts)


def _build_context(compare_run: CompareRun) -> dict:
    ctx: dict = {
        "template_key": compare_run.template_key,
        "campaign_brief": compare_run.campaign_brief,
        "target_network": compare_run.target_network,
    }
    if compare_run.brand_profile_version:
        ctx["brand_profile"] = compare_run.brand_profile_version.profile_data
    return ctx


def _run_single_provider(
    provider_key: str,
    prompt: str,
    context: dict,
) -> tuple[str, GenerationResult]:
    try:
        provider = get_provider(provider_key)
        result = provider.generate(prompt, context)
    except Exception as exc:
        from .providers.base import GenerationResult as GR

        result = GR(
            success=False,
            provider_name=provider_key,
            model_id="",
            error_message=str(exc),
        )
    return provider_key, result


def run_compare(compare_run: CompareRun) -> list[GenerationResult]:
    """Run generation across all selected providers in parallel.

    Creates a DraftVariant for each successful result. Sets compare_run status
    to completed when all providers succeed, or partial_failure when at least
    one fails (as long as at least one succeeds). Returns all results.
    """
    compare_run.status = CompareRun.Status.RUNNING
    compare_run.save(update_fields=["status"])

    prompt = _build_prompt(compare_run)
    context = _build_context(compare_run)

    provider_keys: list[str] = compare_run.providers or []

    results: list[tuple[str, GenerationResult]] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(provider_keys) or 1) as executor:
        futures = {
            executor.submit(_run_single_provider, key, prompt, context): key
            for key in provider_keys
        }
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    # Create a placeholder DraftPost to anchor variants (one per compare run).
    draft_post = _get_or_create_draft_post(compare_run)

    successes = 0
    failures = 0
    generation_results: list[GenerationResult] = []

    for provider_key, result in results:
        generation_results.append(result)
        if result.success:
            successes += 1
            DraftVariant.objects.create(
                draft_post=draft_post,
                provider=result.provider_name,
                model_id=result.model_id,
                prompt_text=prompt,
                generated_text=result.generated_text,
            )
        else:
            failures += 1

    if failures == 0:
        compare_run.status = CompareRun.Status.COMPLETED
    elif successes > 0:
        compare_run.status = CompareRun.Status.PARTIAL_FAILURE
    else:
        # All providers failed — still mark partial_failure so results are visible.
        compare_run.status = CompareRun.Status.PARTIAL_FAILURE

    compare_run.save(update_fields=["status"])
    return generation_results


def _get_or_create_draft_post(compare_run: CompareRun) -> DraftPost:
    """Return an existing DraftPost tied to this compare_run, or create one."""
    existing = DraftPost.objects.filter(
        workspace=compare_run.workspace,
        title=f"compare-run-{compare_run.pk}",
    ).first()
    if existing:
        return existing
    return DraftPost.objects.create(
        workspace=compare_run.workspace,
        created_by=compare_run.created_by,
        title=f"compare-run-{compare_run.pk}",
        brand_profile_version=compare_run.brand_profile_version,
    )
