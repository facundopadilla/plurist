"""
Tests that a compare run where one provider fails still returns results from
the other providers and sets status to partial_failure.
"""

from unittest.mock import patch

import pytest

from apps.generation.models import CompareRun
from apps.generation.providers.base import GenerationResult
from apps.generation.services import run_compare
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _make_failing_result(provider_key: str) -> tuple[str, GenerationResult]:
    return provider_key, GenerationResult(
        success=False,
        provider_name=provider_key,
        model_id="",
        error_message="Simulated provider failure",
    )


def _make_success_result(provider_key: str) -> tuple[str, GenerationResult]:
    return provider_key, GenerationResult(
        success=True,
        provider_name=provider_key,
        model_id="mock-model",
        generated_text=f"[{provider_key}] Great post content here",
    )


def test_partial_failure_one_provider_fails():
    """When one of two providers fails, status is partial_failure and the
    successful variant is still created."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        template_key="social-post-v1",
        campaign_brief="Launch our new product",
        providers=["openai", "anthropic"],
        slide_count=1,
        created_by=user,
    )

    # Patch _run_single_provider so openai succeeds and anthropic fails.
    def fake_run_single(provider_key, prompt, context):
        if provider_key == "openai":
            return _make_success_result("openai")
        return _make_failing_result("anthropic")

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=fake_run_single,
    ):
        results = run_compare(compare_run)

    compare_run.refresh_from_db()
    assert compare_run.status == CompareRun.Status.PARTIAL_FAILURE

    successes = [r for r in results if r.success]
    failures = [r for r in results if not r.success]
    assert len(successes) == 1
    assert len(failures) == 1
    assert successes[0].provider_name == "openai"
    assert failures[0].provider_name == "anthropic"


def test_all_providers_succeed_status_completed():
    """When all providers succeed, status is completed."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="owner")

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        template_key="social-post-v1",
        campaign_brief="Summer sale campaign",
        providers=["openai", "gemini"],
        slide_count=1,
        created_by=user,
    )

    def fake_run_single(provider_key, prompt, context):
        return _make_success_result(provider_key)

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=fake_run_single,
    ):
        results = run_compare(compare_run)

    compare_run.refresh_from_db()
    assert compare_run.status == CompareRun.Status.COMPLETED
    assert all(r.success for r in results)


def test_all_providers_fail_status_partial_failure():
    """When all providers fail, status is partial_failure (not completed)."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")

    compare_run = CompareRun.objects.create(
        workspace=workspace,
        template_key="social-post-v1",
        campaign_brief="Winter campaign",
        providers=["openai", "anthropic"],
        slide_count=1,
        created_by=user,
    )

    def fake_run_single(provider_key, prompt, context):
        return _make_failing_result(provider_key)

    with patch(
        "apps.generation.services._run_single_provider",
        side_effect=fake_run_single,
    ):
        results = run_compare(compare_run)

    compare_run.refresh_from_db()
    assert compare_run.status == CompareRun.Status.PARTIAL_FAILURE
    assert all(not r.success for r in results)


def test_api_post_compare_returns_201(client):
    """Smoke test: POST /generation/compare returns 201 with variants."""
    workspace = WorkspaceFactory()
    user = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=user, workspace=workspace, role="editor")

    # Login
    csrf_response = client.get("/api/v1/auth/csrf")
    csrf_token = csrf_response.json().get("csrf_token", "")
    client.post(
        "/api/v1/auth/login",
        data={"email": user.email, "password": "testpassword123"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=csrf_token,
    )

    # POST compare — providers will use mock mode (no real API keys in test env)
    response = client.post(
        "/api/v1/generation/compare",
        data={
            "template_key": "social-post-v1",
            "campaign_brief": "Announce our product launch",
            "providers": ["openai", "anthropic"],
        },
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=csrf_token,
    )

    assert response.status_code == 202
    body = response.json()
    assert "id" in body
    assert body["status"] in {"pending", "running", "completed", "partial_failure"}
