"""
Tests for multi-slide carousel generation.
Verifies slide_count handling and _estimate_slide_count heuristic.
"""

from unittest.mock import patch

import pytest

from apps.generation.models import CompareRun
from apps.generation.providers.base import GenerationResult
from apps.generation.services import _estimate_slide_count, run_compare
from apps.posts.models import DraftVariant
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _success_result(provider_key: str) -> tuple[str, GenerationResult]:
    return provider_key, GenerationResult(
        success=True,
        provider_name=provider_key,
        model_id="mock-model",
        generated_text=f"[{provider_key}] Slide content",
    )


# ---------------------------------------------------------------------------
# Heuristic unit tests
# ---------------------------------------------------------------------------


def test_estimate_slide_count_short_brief():
    """Brief < 300 words → minimum default of 3."""
    brief = "Our new product is amazing."
    count = _estimate_slide_count(brief)
    assert count == 3


def test_estimate_slide_count_long_brief():
    """Brief with 400 words → 4 slides."""
    brief = " ".join(["word"] * 400)
    count = _estimate_slide_count(brief)
    assert count == 4


def test_estimate_slide_count_capped_at_max():
    """Brief with 2000 words → capped at 10."""
    brief = " ".join(["word"] * 2000)
    count = _estimate_slide_count(brief, max_slides=10)
    assert count == 10


# ---------------------------------------------------------------------------
# run_compare with explicit slide_count
# ---------------------------------------------------------------------------


def test_run_compare_with_slide_count():
    """When slide_count=3, creates 3 × N_providers variants with correct slide_index."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        campaign_brief="Promote our summer collection",
        providers=["openai", "anthropic"],
        slide_count=3,
        created_by=user,
    )

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=lambda key, prompt, ctx: _success_result(key),
    ):
        results = run_compare(compare_run)

    compare_run.refresh_from_db()
    assert compare_run.status == CompareRun.Status.COMPLETED

    # 3 slides × 2 providers = 6 variants
    assert len(results) == 6

    variants = DraftVariant.objects.filter(draft_post__title=f"compare-run-{compare_run.pk}")
    assert variants.count() == 6

    slide_indexes = sorted(set(v.slide_index for v in variants))
    assert slide_indexes == [0, 1, 2]

    for slide_idx in [0, 1, 2]:
        slide_variants = variants.filter(slide_index=slide_idx)
        assert slide_variants.count() == 2
        providers_for_slide = set(slide_variants.values_list("provider", flat=True))
        assert providers_for_slide == {"openai", "anthropic"}


def test_run_compare_single_slide():
    """When slide_count=1, all variants have slide_index=0."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        campaign_brief="Single slide post",
        providers=["openai"],
        slide_count=1,
        created_by=user,
    )

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=lambda key, prompt, ctx: _success_result(key),
    ):
        run_compare(compare_run)

    variants = DraftVariant.objects.filter(draft_post__title=f"compare-run-{compare_run.pk}")
    assert variants.count() == 1
    assert variants.first().slide_index == 0


# ---------------------------------------------------------------------------
# run_compare with slide_count=None (AI decides)
# ---------------------------------------------------------------------------


def test_ai_decides_slide_count():
    """When slide_count is None, _estimate_slide_count is used to determine N."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")

    # Brief with ~150 words → heuristic returns max(3, 150//100) = 3
    brief = " ".join(["content"] * 150)

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        campaign_brief=brief,
        providers=["openai"],
        slide_count=None,  # AI decides
        created_by=user,
    )

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=lambda key, prompt, ctx: _success_result(key),
    ):
        run_compare(compare_run)

    compare_run.refresh_from_db()
    assert compare_run.status == CompareRun.Status.COMPLETED

    variants = DraftVariant.objects.filter(draft_post__title=f"compare-run-{compare_run.pk}")
    # Heuristic: max(3, 150//100) = max(3,1) = 3
    assert variants.count() == 3
    slide_indexes = sorted(v.slide_index for v in variants)
    assert slide_indexes == [0, 1, 2]


def test_ai_decides_slide_count_long_brief():
    """With a 500-word brief, AI decides on 5 slides."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")

    brief = " ".join(["content"] * 500)

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        campaign_brief=brief,
        providers=["gemini"],
        slide_count=None,
        created_by=user,
    )

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=lambda key, prompt, ctx: _success_result(key),
    ):
        run_compare(compare_run)

    variants = DraftVariant.objects.filter(draft_post__title=f"compare-run-{compare_run.pk}")
    # max(3, 500//100) = max(3,5) = 5
    assert variants.count() == 5
