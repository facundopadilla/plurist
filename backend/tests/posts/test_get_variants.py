# pyright: reportAttributeAccessIssue=false
"""Tests for GET /{post_id}/variants endpoint."""

import pytest

from apps.posts.models import DraftPost, DraftVariant
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _create_user_with_role(workspace, role: str):
    user = UserFactory()
    MembershipFactory(user=user, workspace=workspace, role=role)
    return user


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


def test_get_variants_empty(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_var1@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = DraftPost.objects.create(workspace=workspace, created_by=editor, title="Post", body_text="text")

    _login(client, editor.email)
    response = client.get(f"/api/v1/content/{post.pk}/variants")
    assert response.status_code == 200
    assert response.json() == []


def test_get_variants_returns_all(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_var2@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    post = DraftPost.objects.create(workspace=workspace, created_by=editor, title="Post", body_text="text")
    DraftVariant.objects.create(
        draft_post=post,
        provider="openai",
        model_id="gpt-4o",
        prompt_text="prompt",
        generated_text="text1",
        generated_html="<div>1</div>",
        slide_index=0,
    )
    DraftVariant.objects.create(
        draft_post=post,
        provider="anthropic",
        model_id="claude-3-5-sonnet-20241022",
        prompt_text="prompt",
        generated_text="text2",
        generated_html="<div>2</div>",
        slide_index=1,
    )

    _login(client, editor.email)
    response = client.get(f"/api/v1/content/{post.pk}/variants")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["slide_index"] == 0
    assert data[0]["provider"] == "openai"
    assert data[1]["slide_index"] == 1
    assert data[1]["provider"] == "anthropic"
    # Verify all expected fields are present
    for v in data:
        assert "id" in v
        assert "generated_html" in v
        assert "is_selected" in v
        assert "created_at" in v


def test_get_variants_404_wrong_workspace(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor_var3@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")

    _login(client, editor.email)
    response = client.get("/api/v1/content/99999/variants")
    assert response.status_code == 404
