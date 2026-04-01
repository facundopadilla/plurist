import os

import pytest

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


def _setup_owner(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)
    return owner, workspace


# ---------------------------------------------------------------------------
# GET /feature-flags — Owner only
# ---------------------------------------------------------------------------


def test_owner_can_get_feature_flags(client):
    _setup_owner(client)
    response = client.get("/api/v1/integrations/feature-flags")
    assert response.status_code == 200
    body = response.json()
    assert "linkedin" in body
    assert "x" in body
    assert "instagram" in body


def test_editor_cannot_get_feature_flags(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.get("/api/v1/integrations/feature-flags")
    assert response.status_code == 403


def test_publisher_cannot_get_feature_flags(client):
    workspace = WorkspaceFactory()
    publisher = UserFactory(email="publisher@example.com", password="testpassword123")
    MembershipFactory(user=publisher, workspace=workspace, role="publisher")
    _login(client, publisher.email)

    response = client.get("/api/v1/integrations/feature-flags")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# PATCH /feature-flags — Owner only
# ---------------------------------------------------------------------------


def test_owner_can_toggle_feature_flag(client, monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "false")
    _setup_owner(client)

    response = client.patch(
        "/api/v1/integrations/feature-flags",
        data={"linkedin": True},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["linkedin"] is True


def test_editor_cannot_patch_feature_flags(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.patch(
        "/api/v1/integrations/feature-flags",
        data={"linkedin": True},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Mock mode returns MockAdapter
# ---------------------------------------------------------------------------


def test_mock_mode_returns_mock_adapter(monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "false")
    from apps.integrations.providers.mock_adapter import MockAdapter
    from apps.integrations.registry import get_adapter

    adapter = get_adapter("linkedin")
    assert isinstance(adapter, MockAdapter)


def test_mock_adapter_authenticate_returns_true(monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "false")
    from apps.integrations.providers.mock_adapter import MockAdapter

    adapter = MockAdapter("linkedin")
    assert adapter.authenticate(None) is True


def test_mock_adapter_publish_returns_success(monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "false")
    from apps.integrations.providers.mock_adapter import MockAdapter

    adapter = MockAdapter("x")
    result = adapter.publish(None, {"text": "Hello"})
    assert result.success is True
    assert result.external_post_id == "mock-post-id"


def test_flags_default_to_false():
    """Feature flags default to mock mode when env vars are unset."""
    from apps.integrations.feature_flags import is_live

    # Remove env vars to test defaults
    for key in ["FEATURE_LINKEDIN_LIVE", "FEATURE_X_LIVE", "FEATURE_INSTAGRAM_LIVE"]:
        os.environ.pop(key, None)

    assert is_live("linkedin") is False
    assert is_live("x") is False
    assert is_live("instagram") is False


def test_flag_true_when_env_set(monkeypatch):
    monkeypatch.setenv("FEATURE_X_LIVE", "true")
    from apps.integrations.feature_flags import is_live

    assert is_live("x") is True


def test_get_all_flags_returns_all_networks(monkeypatch):
    monkeypatch.setenv("FEATURE_LINKEDIN_LIVE", "false")
    monkeypatch.setenv("FEATURE_X_LIVE", "false")
    monkeypatch.setenv("FEATURE_INSTAGRAM_LIVE", "false")
    from apps.integrations.feature_flags import get_all_flags

    flags = get_all_flags()
    assert set(flags.keys()) == {"linkedin", "x", "instagram"}
