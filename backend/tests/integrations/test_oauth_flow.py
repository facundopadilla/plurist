"""Tests for the social OAuth start/callback/disconnect endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from django.http import HttpResponseRedirect

from apps.publishing.models import SocialConnection
from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


def _csrf(client):
    return client.get("/api/v1/auth/csrf").json().get("csrf_token", "")


def _login(client, email, password="testpassword123"):
    client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
        content_type="application/json",
        HTTP_X_CSRF_TOKEN=_csrf(client),
    )


def _make_owner(client):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="redes_owner@example.com", password="testpassword123")
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    _login(client, owner.email)
    return workspace, owner


# ---------------------------------------------------------------------------
# Start endpoint
# ---------------------------------------------------------------------------


def test_oauth_start_redirects_for_x(client):
    _make_owner(client)

    mock_oauth = MagicMock()
    mock_oauth.x.authorize_redirect.return_value = HttpResponseRedirect(
        "https://twitter.com/i/oauth2/authorize?state=test"
    )

    with patch("apps.integrations.oauth_providers.social_oauth", mock_oauth):
        response = client.get("/api/v1/integrations/oauth/x/start")

    assert response.status_code == 302


def test_oauth_start_requires_owner(client):
    workspace = WorkspaceFactory()
    editor = UserFactory(email="redes_editor@example.com", password="testpassword123")
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    _login(client, editor.email)

    response = client.get("/api/v1/integrations/oauth/x/start")
    assert response.status_code == 403


def test_oauth_start_rejects_unknown_network(client):
    _make_owner(client)
    response = client.get("/api/v1/integrations/oauth/tiktok/start")
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Callback endpoint
# ---------------------------------------------------------------------------


def _fake_token(access_token="test_access", expires_at=9999999999):
    return {
        "access_token": access_token,
        "expires_at": expires_at,
        "token_type": "Bearer",
    }


def test_oauth_callback_x_creates_connection(client):
    workspace, owner = _make_owner(client)

    # Pre-seed session state (simulating what /start would set)
    session = client.session
    session["social_oauth_state_x"] = "teststate"
    session["social_oauth_verifier_x"] = "testverifier"
    session.save()

    mock_oauth = MagicMock()
    mock_oauth.x.authorize_access_token.return_value = _fake_token()

    with (
        patch("apps.integrations.oauth_providers.social_oauth", mock_oauth),
        patch("apps.integrations.api.httpx.get") as mock_get,
    ):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": {"id": "42", "username": "testuser", "name": "Test"}},
            raise_for_status=lambda: None,
        )
        response = client.get(
            "/api/v1/integrations/oauth/x/callback",
            {"state": "teststate", "code": "authcode"},
        )

    assert response.status_code == 302
    assert SocialConnection.objects.filter(workspace=workspace, network="x", provider_user_id="42").exists()


def test_oauth_callback_invalid_state_returns_400(client):
    _make_owner(client)

    session = client.session
    session["social_oauth_state_x"] = "expected_state"
    session.save()

    response = client.get(
        "/api/v1/integrations/oauth/x/callback",
        {"state": "wrong_state"},
    )
    assert response.status_code == 400


def test_oauth_callback_missing_state_returns_400(client):
    _make_owner(client)
    response = client.get("/api/v1/integrations/oauth/x/callback", {"state": "xyz"})
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Disconnect endpoint
# ---------------------------------------------------------------------------


def test_disconnect_marks_connection_revoked(client):
    workspace, owner = _make_owner(client)
    conn = SocialConnection.objects.create(
        workspace=workspace,
        network="x",
        display_name="@test",
        provider_user_id="42",
        is_active=True,
        status="connected",
        created_by=owner,
    )

    response = client.post(f"/api/v1/integrations/oauth/{conn.pk}/disconnect")

    assert response.status_code == 200
    conn.refresh_from_db()
    assert conn.status == SocialConnection.Status.REVOKED
    assert not conn.is_active


def test_disconnect_returns_404_for_nonexistent_connection(client):
    """Disconnecting an unknown connection_id returns 404."""
    _make_owner(client)
    response = client.post("/api/v1/integrations/oauth/99999/disconnect")
    assert response.status_code == 404
