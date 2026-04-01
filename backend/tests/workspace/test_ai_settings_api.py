"""Tests for GET/PUT /api/v1/workspace/ai-settings (owner-only)."""

from __future__ import annotations

import pytest

from tests.accounts.factories import MembershipFactory, UserFactory, WorkspaceFactory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers (same pattern as test_roles.py)
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


def _make_owner(password="testpassword123"):
    workspace = WorkspaceFactory()
    owner = UserFactory(email="owner@ai.test", password=password)
    MembershipFactory(user=owner, workspace=workspace, role="owner")
    return workspace, owner


def _make_editor(workspace, password="testpassword123"):
    editor = UserFactory(email="editor@ai.test", password=password)
    MembershipFactory(user=editor, workspace=workspace, role="editor")
    return editor


# ---------------------------------------------------------------------------
# GET /api/v1/workspace/ai-settings
# ---------------------------------------------------------------------------


class TestGetAISettings:
    def test_unauthenticated_returns_401(self, client):
        response = client.get("/api/v1/workspace/ai-settings")
        assert response.status_code == 401

    def test_editor_returns_403(self, client):
        workspace, _ = _make_owner()
        editor = _make_editor(workspace)
        _login(client, editor.email)
        response = client.get("/api/v1/workspace/ai-settings")
        assert response.status_code == 403

    def test_owner_gets_default_settings(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow2@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)

        response = client.get("/api/v1/workspace/ai-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["has_openai_key"] is False
        assert data["has_anthropic_key"] is False
        assert data["has_gemini_key"] is False
        assert data["has_openrouter_key"] is False
        assert data["ollama_base_url"] == ""
        assert data["preferred_models"] == {}

    def test_owner_gets_flags_after_key_set(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow3@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)
        csrf = _csrf(client)

        # PUT a key
        client.put(
            "/api/v1/workspace/ai-settings",
            data={"openai_api_key": "sk-test-123"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )

        response = client.get("/api/v1/workspace/ai-settings")
        assert response.status_code == 200
        assert response.json()["has_openai_key"] is True

    def test_response_never_contains_raw_key(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow4@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)
        csrf = _csrf(client)

        client.put(
            "/api/v1/workspace/ai-settings",
            data={"openai_api_key": "sk-secret-value"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )

        response = client.get("/api/v1/workspace/ai-settings")
        body = response.content.decode()
        assert "sk-secret-value" not in body


# ---------------------------------------------------------------------------
# PUT /api/v1/workspace/ai-settings
# ---------------------------------------------------------------------------


class TestPutAISettings:
    def test_unauthenticated_returns_401(self, client):
        response = client.put(
            "/api/v1/workspace/ai-settings",
            data={},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_editor_returns_403(self, client):
        workspace = WorkspaceFactory()
        editor = UserFactory(email="ed2@ai.test", password="testpassword123")
        MembershipFactory(user=editor, workspace=workspace, role="editor")
        _login(client, editor.email)
        csrf = _csrf(client)

        response = client.put(
            "/api/v1/workspace/ai-settings",
            data={"openai_api_key": "sk-test"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 403

    def test_owner_can_set_all_keys(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow5@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)
        csrf = _csrf(client)

        response = client.put(
            "/api/v1/workspace/ai-settings",
            data={
                "openai_api_key": "sk-openai-test",
                "anthropic_api_key": "sk-ant-test",
                "gemini_api_key": "gemini-test",
                "openrouter_api_key": "sk-or-test",
                "ollama_base_url": "http://localhost:11434",
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_openai_key"] is True
        assert data["has_anthropic_key"] is True
        assert data["has_gemini_key"] is True
        assert data["has_openrouter_key"] is True
        assert data["ollama_base_url"] == "http://localhost:11434"

    def test_owner_can_clear_key_with_empty_string(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow6@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)
        csrf = _csrf(client)

        # First set a key
        client.put(
            "/api/v1/workspace/ai-settings",
            data={"openai_api_key": "sk-test"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        # Then clear it
        response = client.put(
            "/api/v1/workspace/ai-settings",
            data={"openai_api_key": ""},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 200
        assert response.json()["has_openai_key"] is False

    def test_null_field_leaves_existing_key_unchanged(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow7@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)
        csrf = _csrf(client)

        # Set openai key
        client.put(
            "/api/v1/workspace/ai-settings",
            data={"openai_api_key": "sk-original"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        # PUT without the openai key field (null)
        response = client.put(
            "/api/v1/workspace/ai-settings",
            data={"anthropic_api_key": "sk-ant"},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_openai_key"] is True  # unchanged
        assert data["has_anthropic_key"] is True

    def test_owner_can_set_preferred_models(self, client):
        workspace = WorkspaceFactory()
        owner = UserFactory(email="ow8@ai.test", password="testpassword123")
        MembershipFactory(user=owner, workspace=workspace, role="owner")
        _login(client, owner.email)
        csrf = _csrf(client)

        preferred = {"openai": "gpt-4o-mini", "anthropic": "claude-3-haiku-20240307"}
        response = client.put(
            "/api/v1/workspace/ai-settings",
            data={"preferred_models": preferred},
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 200
        assert response.json()["preferred_models"] == preferred
