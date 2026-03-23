# pyright: reportAttributeAccessIssue=false
"""Tests for idempotent immediate-publish endpoint."""

from unittest.mock import MagicMock, patch

import pytest

from apps.accounts.models import RoleChoices
from apps.posts.models import DraftPost
from apps.publishing.models import PublishAttempt
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db(transaction=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_user_with_role(workspace, role: str):
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role=role)
    return user


def _create_approved_post(workspace, editor, owner):
    """Create a post that is already in approved state."""
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=editor,
        title="Test post",
        body_text="Some content",
        target_networks=["linkedin"],
    )
    post.submit_for_approval(editor)
    post.approve(owner, reason="looks good")
    post.refresh_from_db()
    return post


# ---------------------------------------------------------------------------
# Idempotency tests (service layer, no HTTP)
# ---------------------------------------------------------------------------


@patch("apps.publishing.tasks.execute_publish.delay")
def test_same_idempotency_key_returns_existing_attempts(mock_delay):
    """Second call with same key returns existing attempts without creating new rows."""
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, RoleChoices.EDITOR)
    owner = _create_user_with_role(workspace, RoleChoices.OWNER)
    post = _create_approved_post(workspace, editor, owner)

    from apps.publishing.api import _do_publish_now

    key = "idem-key-abc123"

    # First call
    attempts_1 = _do_publish_now(post, actor=owner, idempotency_key=key)
    assert len(attempts_1) == 1
    assert mock_delay.call_count == 1

    # Reset post back to approved so the second call doesn't fail on status check.
    # With idempotency the second call should short-circuit before calling start_publishing.
    mock_delay.reset_mock()

    # Second call with same key
    attempts_2 = _do_publish_now(post, actor=owner, idempotency_key=key)

    assert len(attempts_2) == 1
    assert attempts_2[0].pk == attempts_1[0].pk, "Must return the same attempt row"
    # No new Celery task should have been enqueued
    mock_delay.assert_not_called()


@patch("apps.publishing.tasks.execute_publish.delay")
def test_different_idempotency_key_creates_new_attempt(mock_delay):
    """Different key on a fresh approved post creates a new attempt."""
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, RoleChoices.EDITOR)
    owner = _create_user_with_role(workspace, RoleChoices.OWNER)
    post = _create_approved_post(workspace, editor, owner)

    from apps.publishing.api import _do_publish_now

    attempts = _do_publish_now(post, actor=owner, idempotency_key="unique-key-xyz")

    assert len(attempts) == 1
    assert PublishAttempt.objects.filter(draft_post=post).count() == 1
    mock_delay.assert_called_once_with(attempts[0].pk)


@patch("apps.publishing.tasks.execute_publish.delay")
def test_only_one_adapter_call_per_network_on_idempotent_retry(mock_delay):
    """Adapter publish() is called exactly once per network even if endpoint is hit twice."""
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, RoleChoices.EDITOR)
    owner = _create_user_with_role(workspace, RoleChoices.OWNER)
    post = _create_approved_post(workspace, editor, owner)

    from apps.publishing.api import _do_publish_now

    key = "idem-adapter-key"
    _do_publish_now(post, actor=owner, idempotency_key=key)
    _do_publish_now(post, actor=owner, idempotency_key=key)

    # Only 1 Celery task enqueued across both calls
    assert mock_delay.call_count == 1


# ---------------------------------------------------------------------------
# HTTP endpoint idempotency tests
# ---------------------------------------------------------------------------


def _csrf(client):
    response = client.get("/api/v1/auth/csrf")
    return response.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    return client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


@patch("apps.publishing.tasks.execute_publish.delay")
def test_publish_now_endpoint_returns_202(mock_delay, client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@pub.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role=RoleChoices.EDITOR)
    owner = UserFactory(email="owner@pub.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role=RoleChoices.OWNER)

    post = _create_approved_post(workspace, editor, owner)
    _login(client, owner.email)

    response = client.post(
        f"/api/v1/publishing/publish-now/{post.pk}",
        HTTP_X_CSRF_TOKEN=_csrf(client),
        HTTP_IDEMPOTENCY_KEY="test-key-001",
    )
    assert response.status_code == 202
    body = response.json()
    assert body["post_id"] == post.pk
    assert len(body["attempts"]) == 1
    assert body["attempts"][0]["idempotency_key"] == "test-key-001"


@patch("apps.publishing.tasks.execute_publish.delay")
def test_publish_now_endpoint_idempotent_second_request(mock_delay, client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor2@pub.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role=RoleChoices.EDITOR)
    owner = UserFactory(email="owner2@pub.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role=RoleChoices.OWNER)

    post = _create_approved_post(workspace, editor, owner)
    _login(client, owner.email)
    csrf = _csrf(client)
    key = "idem-http-key-xyz"

    r1 = client.post(
        f"/api/v1/publishing/publish-now/{post.pk}",
        HTTP_X_CSRF_TOKEN=csrf,
        HTTP_IDEMPOTENCY_KEY=key,
    )
    assert r1.status_code == 202
    attempt_id_1 = r1.json()["attempts"][0]["id"]

    r2 = client.post(
        f"/api/v1/publishing/publish-now/{post.pk}",
        HTTP_X_CSRF_TOKEN=csrf,
        HTTP_IDEMPOTENCY_KEY=key,
    )
    assert r2.status_code == 202
    attempt_id_2 = r2.json()["attempts"][0]["id"]

    assert attempt_id_1 == attempt_id_2
    assert mock_delay.call_count == 1


@patch("apps.publishing.tasks.execute_publish.delay")
def test_publish_now_endpoint_requires_publisher_role(mock_delay, client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor3@pub.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role=RoleChoices.EDITOR)
    owner = UserFactory(email="owner3@pub.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role=RoleChoices.OWNER)

    post = _create_approved_post(workspace, editor, owner)
    _login(client, editor.email)

    response = client.post(
        f"/api/v1/publishing/publish-now/{post.pk}",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 403


@patch("apps.publishing.tasks.execute_publish.delay")
def test_publish_now_endpoint_rejects_non_approved_post(mock_delay, client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner4@pub.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role=RoleChoices.OWNER)

    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=owner,
        title="Draft post",
        body_text="content",
        target_networks=["linkedin"],
    )
    _login(client, owner.email)

    response = client.post(
        f"/api/v1/publishing/publish-now/{post.pk}",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 400
