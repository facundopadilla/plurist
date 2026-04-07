"""
Tests for analytics API endpoints.
Verifies JSON structure and access control.
"""

import pytest

from apps.analytics.services import record_event
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _csrf(client):
    r = client.get("/api/v1/auth/csrf")
    return r.json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


# --- /analytics/summary ---


def test_summary_returns_correct_structure(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    record_event(workspace, "content_created", owner, "draft_post", 1)
    record_event(workspace, "content_completed", owner, "draft_post", 1)
    _login(client, owner.email)

    response = client.get("/api/v1/analytics/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["content_created"] == 1
    assert data["content_completed"] == 1
    assert data["content_reverted"] == 0


def test_summary_unauthenticated_returns_401(client):
    WorkspaceFactory()
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 401


# --- /analytics/timeline ---


def test_timeline_returns_list_of_events(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner2@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    record_event(workspace, "content_created", owner, "draft_post", 10)
    record_event(workspace, "content_completed", owner, "draft_post", 10)
    _login(client, owner.email)

    response = client.get("/api/v1/analytics/timeline")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["event_type"] == "content_completed"
    assert data[1]["event_type"] == "content_created"


def test_timeline_event_has_required_fields(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner3@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    record_event(workspace, "content_created", owner, "draft_post", 99)
    _login(client, owner.email)

    response = client.get("/api/v1/analytics/timeline")

    assert response.status_code == 200
    event = response.json()[0]
    assert "id" in event
    assert "event_type" in event
    assert "actor_id" in event
    assert "target_type" in event
    assert "target_id" in event
    assert "metadata" in event
    assert "created_at" in event


def test_timeline_unauthenticated_returns_401(client):
    WorkspaceFactory()
    response = client.get("/api/v1/analytics/timeline")
    assert response.status_code == 401


# --- /analytics/timeline/{target_type}/{target_id} ---


def test_target_timeline_filters_correctly(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner4@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    record_event(workspace, "content_created", owner, "draft_post", 7)
    record_event(workspace, "content_completed", owner, "draft_post", 7)
    record_event(workspace, "content_created", owner, "draft_post", 8)
    _login(client, owner.email)

    response = client.get("/api/v1/analytics/timeline/draft_post/7")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for event in data:
        assert event["target_type"] == "draft_post"
        assert event["target_id"] == 7


def test_target_timeline_empty_for_unknown_target(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor2@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.get("/api/v1/analytics/timeline/draft_post/99999")

    assert response.status_code == 200
    assert response.json() == []
