from __future__ import annotations

import concurrent.futures

from apps.posts.models import DraftPost, DraftVariant

from .models import CompareRun
from .prompt_builder import build_design_prompt
from .providers.base import GenerationResult
from .providers.registry import get_provider
from .sanitizer import sanitize_html


def _estimate_slide_count(brief: str, default: int = 3, max_slides: int = 10) -> int:
    """Heuristic: one slide per ~100 words of brief, minimum 3."""
    word_count = len(brief.split())
    estimate = max(default, word_count // 100)
    return min(estimate, max_slides)


def _build_prompt(compare_run: CompareRun, slide_index: int = 0, total_slides: int = 1) -> str:
    project_id = compare_run.project_id if compare_run.project_id else None

    if project_id:
        return build_design_prompt(
            campaign_brief=compare_run.campaign_brief,
            fmt=compare_run.format or "ig_square",
            project_id=project_id,
            target_network=compare_run.target_network,
            slide_index=slide_index,
            total_slides=total_slides,
        )

    # Legacy text-only prompt (single slide)
    parts = [
        f"Campaign brief: {compare_run.campaign_brief}",
    ]
    if compare_run.template_key:
        parts.insert(0, f"Template: {compare_run.template_key}")
    if compare_run.target_network:
        parts.append(f"Target network: {compare_run.target_network}")
    if compare_run.brand_profile_version:
        bpv = compare_run.brand_profile_version
        parts.append(f"Brand profile: {bpv.profile_data}")
    if total_slides > 1:
        parts.append(
            f"\nThis is slide {slide_index + 1} of {total_slides} in a carousel. "
            "Content should be progressive and complementary to the other slides."
        )
    parts.append("Generate a social media post based on the above.")
    return "\n".join(parts)


def _is_html_prompt(compare_run: CompareRun) -> bool:
    """Return True when the compare run should produce HTML/CSS output."""
    return bool(compare_run.project_id)


def _build_context(compare_run: CompareRun) -> dict:
    ctx: dict = {
        "template_key": compare_run.template_key,
        "campaign_brief": compare_run.campaign_brief,
        "target_network": compare_run.target_network,
        "format": compare_run.format or "ig_square",
        "generate_html": _is_html_prompt(compare_run),
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
        result = GenerationResult(
            success=False,
            provider_name=provider_key,
            model_id="",
            error_message=str(exc),
        )
    return provider_key, result


def _build_compare_tasks(
    compare_run: CompareRun,
    provider_keys: list[str],
    slide_count: int,
) -> list[tuple[str, int, str]]:
    tasks: list[tuple[str, int, str]] = []
    for slide_idx in range(slide_count):
        prompt = _build_prompt(compare_run, slide_index=slide_idx, total_slides=slide_count)
        for key in provider_keys:
            tasks.append((key, slide_idx, prompt))
    return tasks


def _run_compare_tasks(
    tasks: list[tuple[str, int, str]],
    context: dict,
) -> list[tuple[str, int, str, GenerationResult]]:
    max_concurrent = 8
    raw_results: list[tuple[str, int, str, GenerationResult]] = []
    max_workers = min(len(tasks), max_concurrent) or 1
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_task = {
            executor.submit(_run_single_provider, key, prompt, context): (key, slide_idx, prompt)
            for key, slide_idx, prompt in tasks
        }
        for future in concurrent.futures.as_completed(future_to_task):
            key, slide_idx, prompt = future_to_task[future]
            _, result = future.result()
            raw_results.append((key, slide_idx, prompt, result))
    return raw_results


def _persist_generation_results(
    raw_results: list[tuple[str, int, str, GenerationResult]],
    draft_post: DraftPost,
    is_html: bool,
) -> tuple[int, int, list[GenerationResult]]:
    successes = 0
    failures = 0
    generation_results: list[GenerationResult] = []

    for _provider_key, slide_idx, prompt_text, result in raw_results:
        generation_results.append(result)
        if not result.success:
            failures += 1
            continue

        successes += 1
        generated_html = ""
        generated_text = result.generated_text
        if is_html:
            generated_html = sanitize_html(result.generated_text)
            generated_text = ""

        DraftVariant.objects.create(
            draft_post=draft_post,
            provider=result.provider_name,
            model_id=result.model_id,
            prompt_text=prompt_text,
            generated_text=generated_text,
            generated_html=generated_html,
            slide_index=slide_idx,
        )

    return successes, failures, generation_results


def run_compare(compare_run: CompareRun) -> list[GenerationResult]:
    """Run generation across all selected providers in parallel.

    Supports multi-slide carousel generation: creates one DraftVariant per
    provider per slide, with slide_index set. Sets compare_run status to
    completed/partial_failure based on results.
    """
    compare_run.status = CompareRun.Status.RUNNING
    compare_run.save(update_fields=["status"])

    # Determine slide count
    slide_count = compare_run.slide_count
    if slide_count is None:
        slide_count = _estimate_slide_count(compare_run.campaign_brief)

    context = _build_context(compare_run)
    provider_keys: list[str] = compare_run.providers or []

    is_html = _is_html_prompt(compare_run)

    tasks = _build_compare_tasks(compare_run, provider_keys, slide_count)
    raw_results = _run_compare_tasks(tasks, context)

    # Create placeholder DraftPost to anchor variants
    draft_post = _get_or_create_draft_post(compare_run)
    _, failures, generation_results = _persist_generation_results(
        raw_results,
        draft_post,
        is_html,
    )

    if failures == 0:
        compare_run.status = CompareRun.Status.COMPLETED
    else:
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
