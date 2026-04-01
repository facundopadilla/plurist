# pyright: reportAttributeAccessIssue=false
"""Tests for PATCH /{post_id}, validation fix, and approve() snapshot fix."""

import pytest

from apps.approvals.models import ApprovedSnapshot
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


def _create_post(workspace, user, **kwargs):
    defaults = dict(title="Test post", body_text="", html_content="")
    defaults.update(kwargs)
    return DraftPost.objects.create(workspace=workspace, created_by=user, **defaults)


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


# ---------------------------------------------------------------------------
# Model: _ensure_content_valid_for_submission fix
# ---------------------------------------------------------------------------


def test_html_only_post_can_be_submitted():
    """A post with only html_content should submit."""
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    post = _create_post(
        workspace,
        editor,
        html_content="<html><body>Hello</body></html>",
    )

    post.submit_for_approval(editor)

    post.refresh_from_db()
    assert post.status == DraftPost.Status.PENDING_APPROVAL


def test_empty_post_cannot_be_submitted():
    """A post with no content at all should raise ValidationError on submit."""
    from django.core.exceptions import ValidationError

    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    post = _create_post(workspace, editor)

    with pytest.raises(ValidationError):
        post.submit_for_approval(editor)


# ---------------------------------------------------------------------------
# Model: approve() snapshot includes html_content + format + project_id
# ---------------------------------------------------------------------------


def test_approve_snapshot_includes_html_content_and_format():
    workspace = WorkspaceFactory()
    editor = _create_user_with_role(workspace, "editor")
    owner = _create_user_with_role(workspace, "owner")
    post = _create_post(
        workspace,
        editor,
        html_content="<div>Canvas</div>",
        format="ig_story",
        body_text="",
    )
    post.submit_for_approval(editor)
    post.approve(owner)

    snapshot = ApprovedSnapshot.objects.get(draft_post=post)
    data = snapshot.snapshot_data
    assert data["html_content"] == "<div>Canvas</div>"
    assert data["format"] == "ig_story"
    assert "project_id" in data


# ---------------------------------------------------------------------------
# API: PATCH /{post_id} — primary path /api/v1/content/
# ---------------------------------------------------------------------------


def test_api_patch_post_title(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_patch@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = _create_post(workspace, editor, title="Old Title", body_text="Body")

    _login(client, editor.email)
    response = client.patch(
        f"/api/v1/content/{post.pk}",
        data={"title": "New Title"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


def test_api_patch_post_html_content(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_html@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = _create_post(workspace, editor, title="Post", body_text="text")

    _login(client, editor.email)
    new_html = "<div>Updated HTML</div>"
    response = client.patch(
        f"/api/v1/content/{post.pk}",
        data={"html_content": new_html},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 200
    assert response.json()["html_content"] == new_html


def test_api_patch_post_format(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_fmt@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = _create_post(
        workspace,
        editor,
        title="Post",
        body_text="text",
        format="ig_square",
    )

    _login(client, editor.email)
    response = client.patch(
        f"/api/v1/content/{post.pk}",
        data={"format": "ig_story"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 200
    assert response.json()["format"] == "ig_story"


def test_api_patch_requires_editor_role(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_owner@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    viewer = UserFactory(email="viewer_patch@test.com", password="testpassword123")
    MembershipFactory(user=viewer, workspace=workspace, role="publisher")
    post = _create_post(workspace, editor, title="Post", body_text="text")

    _login(client, viewer.email)
    response = client.patch(
        f"/api/v1/content/{post.pk}",
        data={"title": "Hack"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 403


def test_api_patch_post_not_found(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_404@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")

    _login(client, editor.email)
    response = client.patch(
        "/api/v1/content/99999",
        data={"title": "Ghost"},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 404
