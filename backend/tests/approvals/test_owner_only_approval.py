# pyright: reportAttributeAccessIssue=false
"""Tests that only Owner can approve/reject; Editor and Publisher cannot."""

import pytest

from apps.approvals.models import ApprovalDecision
from apps.posts.models import DraftPost
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_user_with_role(workspace, role: str):
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role=role)
    return user


def _create_pending_post(workspace, editor):
    """Create a post already submitted for approval."""
    post = DraftPost.objects.create(
        workspace=workspace,
        created_by=editor,
        title="Pending post",
        body_text="Body content",
        target_networks=["linkedin"],
    )
    post.submit_for_approval(editor)
    return post


# ---------------------------------------------------------------------------
# Approval: role enforcement (model-level)
# ---------------------------------------------------------------------------


def test_owner_can_approve():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_pending_post(workspace, editor)

    post.approve(owner, reason="Looks great")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.APPROVED
    decision = ApprovalDecision.objects.get(draft_post=post)
    assert decision.decision == ApprovalDecision.Decision.APPROVED
    assert decision.decided_by == owner


def test_editor_cannot_approve():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    post = _create_pending_post(workspace, editor)

    with pytest.raises(PermissionError):
        post.approve(editor, reason="self-approve")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PENDING_APPROVAL


def test_publisher_cannot_approve():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    publisher = _create_user_with_role(workspace, "publisher")
    post = _create_pending_post(workspace, editor)

    with pytest.raises(PermissionError):
        post.approve(publisher, reason="publisher approve")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PENDING_APPROVAL


def test_owner_can_reject():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_pending_post(workspace, editor)

    post.reject(owner, reason="Needs changes")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.REJECTED
    decision = ApprovalDecision.objects.get(draft_post=post)
    assert decision.decision == ApprovalDecision.Decision.REJECTED


def test_editor_cannot_reject():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    post = _create_pending_post(workspace, editor)

    with pytest.raises(PermissionError):
        post.reject(editor, reason="self-reject")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PENDING_APPROVAL


def test_publisher_cannot_reject():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    publisher = _create_user_with_role(workspace, "publisher")
    post = _create_pending_post(workspace, editor)

    with pytest.raises(PermissionError):
        post.reject(publisher, reason="publisher reject")

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PENDING_APPROVAL


# ---------------------------------------------------------------------------
# API endpoint: approve/reject role enforcement
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


def test_api_owner_can_approve(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_a@approval.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    owner = UserFactory(email="owner_a@approval.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")

    post = _create_pending_post(workspace, editor)
    _login(client, owner.email)

    response = client.post(
        f"/api/v1/posts/{post.pk}/approve",
        data={"reason": "good"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_api_editor_cannot_approve(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_b@approval.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")

    post = _create_pending_post(workspace, editor)
    _login(client, editor.email)

    response = client.post(
        f"/api/v1/posts/{post.pk}/approve",
        data={"reason": "self"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 403


def test_api_publisher_cannot_approve(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_c@approval.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    publisher = UserFactory(email="publisher_c@approval.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")

    post = _create_pending_post(workspace, editor)
    _login(client, publisher.email)

    response = client.post(
        f"/api/v1/posts/{post.pk}/approve",
        data={"reason": "attempt"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 403


def test_api_owner_can_reject(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_d@approval.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    owner = UserFactory(email="owner_d@approval.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")

    post = _create_pending_post(workspace, editor)
    _login(client, owner.email)

    response = client.post(
        f"/api/v1/posts/{post.pk}/reject",
        data={"reason": "not ready"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
