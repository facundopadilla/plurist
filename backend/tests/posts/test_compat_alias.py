# pyright: reportAttributeAccessIssue=false
"""Backward-compatibility check: /api/v1/posts/ alias still serves the posts router."""

import pytest

from apps.posts.models import DraftPost
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


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


def test_compat_alias_list_returns_200(client):
    """GET /api/v1/posts/ (compat alias) returns 200 with expected payload shape."""
    workspace = WorkspaceFactory()
    editor = UserFactory(email="compat_editor@test.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    DraftPost.objects.create(workspace=workspace, created_by=editor, title="Compat post", body_text="body")

    _login(client, editor.email)
    response = client.get("/api/v1/posts/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0]
    assert "title" in data[0]
    assert "status" in data[0]
