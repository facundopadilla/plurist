# pyright: reportAttributeAccessIssue=false
"""Tests for PATCH /{post_id} and content validation."""

import pytest
from django.core.exceptions import ValidationError

from apps.posts.models import DraftPost
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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
# Model: _ensure_content_valid
# ---------------------------------------------------------------------------


def test_html_only_post_can_be_completed():
    """A post with only html_content should complete."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(
        workspace,
        user,
        html_content="<html><body>Hello</body></html>",
    )

    post.mark_completed()

    post.refresh_from_db()
    assert post.status == DraftPost.Status.COMPLETED


def test_empty_post_cannot_be_completed():
    """A post with no content at all should raise ValidationError on complete."""
    workspace = WorkspaceFactory()
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role="editor")
    post = _create_post(workspace, user)

    with pytest.raises(ValidationError):
        post.mark_completed()


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
