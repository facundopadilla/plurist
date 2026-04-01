"""Tests for Phase 2: Ollama Provider Integration."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from apps.generation.providers.ollama_provider import _DEFAULT_BASE_URL, OllamaProvider
from apps.generation.providers.registry import get_provider, list_providers

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# OllamaProvider unit tests
# ---------------------------------------------------------------------------


class TestOllamaProviderInit:
    def test_defaults_to_localhost(self):
        provider = OllamaProvider()
        assert provider._api_base == _DEFAULT_BASE_URL

    def test_explicit_api_base_overrides_default(self):
        provider = OllamaProvider(api_base="http://my-server:11434")
        assert provider._api_base == "http://my-server:11434"

    def test_trailing_slash_stripped(self):
        provider = OllamaProvider(api_base="http://my-server:11434/")
        assert provider._api_base == "http://my-server:11434"

    def test_workspace_settings_url_used(self):
        ws = MagicMock()
        ws.ollama_base_url = "http://workspace-server:11434"
        provider = OllamaProvider(workspace_settings=ws)
        assert provider._api_base == "http://workspace-server:11434"

    def test_explicit_api_base_wins_over_workspace(self):
        ws = MagicMock()
        ws.ollama_base_url = "http://workspace-server:11434"
        provider = OllamaProvider(api_base="http://explicit:11434", workspace_settings=ws)
        assert provider._api_base == "http://explicit:11434"

    def test_empty_workspace_url_falls_back_to_default(self):
        ws = MagicMock()
        ws.ollama_base_url = ""
        provider = OllamaProvider(workspace_settings=ws)
        assert provider._api_base == _DEFAULT_BASE_URL


class TestOllamaProviderMockMode:
    """Tests run without network — provider is in mock mode (default localhost)."""

    def test_generate_returns_success(self):
        provider = OllamaProvider()
        result = provider.generate("Write a post about coffee", {})
        assert result.success is True
        assert result.provider_name == "ollama"
        assert "[ollama-mock]" in result.generated_text

    def test_generate_stream_yields_tokens(self):
        provider = OllamaProvider()
        tokens = list(provider.generate_stream("Create a caption", {}))
        assert len(tokens) > 0
        combined = "".join(tokens)
        assert "[ollama-mock]" in combined

    def test_custom_model_id_preserved(self):
        provider = OllamaProvider(model_id="mistral:latest")
        result = provider.generate("Hello", {})
        assert result.model_id == "mistral:latest"

    def test_default_model_is_llama3(self):
        provider = OllamaProvider()
        assert provider.model_id == "llama3"


class TestOllamaProviderIsNotMockWhenCustomUrl:
    """When a custom URL is set, _is_mock_mode returns False."""

    def test_custom_url_is_not_mock(self):
        provider = OllamaProvider(api_base="http://custom-server:11434")
        assert provider._is_mock_mode() is False

    def test_default_url_is_mock(self):
        provider = OllamaProvider()
        assert provider._is_mock_mode() is True


# ---------------------------------------------------------------------------
# Registry tests
# ---------------------------------------------------------------------------


class TestRegistryIncludesOllama:
    def test_list_providers_includes_ollama(self):
        providers = list_providers()
        assert "ollama" in providers

    def test_get_provider_ollama_returns_instance(self):
        provider = get_provider("ollama")
        assert isinstance(provider, OllamaProvider)

    def test_get_provider_ollama_with_workspace_settings(self):
        ws = MagicMock()
        ws.ollama_base_url = "http://custom:11434"
        provider = get_provider("ollama", workspace_settings=ws)
        assert isinstance(provider, OllamaProvider)
        assert provider._api_base == "http://custom:11434"

    def test_all_providers_mock_generate_successfully(self):
        for key in list_providers():
            provider = get_provider(key)
            result = provider.generate("Write a post about our new product", {})
            assert result.success is True
            assert result.generated_text != ""
            assert result.provider_name == key


# ---------------------------------------------------------------------------
# Ollama models API endpoint tests
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


def _make_member(role="editor"):
    from tests.accounts.factories import (
        MembershipFactory,
        UserFactory,
        WorkspaceFactory,
    )

    workspace = WorkspaceFactory()
    user = UserFactory(email=f"{role}_ollama@test.example", password="testpassword123")
    MembershipFactory(user=user, workspace=workspace, role=role)
    return workspace, user


class TestGetOllamaModelsEndpoint:
    def test_unauthenticated_returns_401(self, client):
        response = client.get("/api/v1/generation/ollama/models")
        assert response.status_code == 401

    def test_returns_empty_list_when_ollama_unreachable(self, client):
        """When Ollama is not running, the endpoint should return [] gracefully."""
        _, user = _make_member("editor")
        _login(client, user.email)

        # httpx will fail to connect to localhost:11434 — endpoint should catch and return []
        response = client.get("/api/v1/generation/ollama/models")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_models_when_ollama_responds(self, client):
        """Mocks a successful Ollama /api/tags response."""
        _, user = _make_member("editor")
        _login(client, user.email)

        mock_tags = {
            "models": [
                {"name": "llama3:latest", "size": 4000000000},
                {"name": "mistral:7b", "size": 4000000000},
                {"name": "codellama:latest", "size": 3000000000},
            ]
        }

        mock_response = MagicMock()
        mock_response.json.return_value = mock_tags
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.get", return_value=mock_response):
            response = client.get("/api/v1/generation/ollama/models")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        names = [m["name"] for m in data]
        assert "llama3:latest" in names
        assert "mistral:7b" in names

    def test_display_name_strips_latest_suffix(self, client):
        """'llama3:latest' → display_name 'llama3'."""
        _, user = _make_member("editor")
        _login(client, user.email)

        mock_tags = {"models": [{"name": "llama3:latest"}]}
        mock_response = MagicMock()
        mock_response.json.return_value = mock_tags
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.get", return_value=mock_response):
            response = client.get("/api/v1/generation/ollama/models")

        assert response.status_code == 200
        model = response.json()[0]
        assert model["name"] == "llama3:latest"
        assert model["display_name"] == "llama3"

    def test_display_name_preserved_when_no_latest(self, client):
        """'mistral:7b' → display_name 'mistral:7b' (kept as-is)."""
        _, user = _make_member("editor")
        _login(client, user.email)

        mock_tags = {"models": [{"name": "mistral:7b"}]}
        mock_response = MagicMock()
        mock_response.json.return_value = mock_tags
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.get", return_value=mock_response):
            response = client.get("/api/v1/generation/ollama/models")

        assert response.status_code == 200
        model = response.json()[0]
        assert model["display_name"] == "mistral:7b"

    def test_uses_workspace_base_url(self, client):
        """Endpoint uses workspace ollama_base_url when set."""
        from apps.workspace.models import WorkspaceAISettings
        from tests.accounts.factories import (
            MembershipFactory,
            UserFactory,
            WorkspaceFactory,
        )

        workspace = WorkspaceFactory()
        user = UserFactory(email="owner_ollama_url@test.example", password="testpassword123")
        MembershipFactory(user=user, workspace=workspace, role="editor")
        _login(client, user.email)

        # Set a custom URL in workspace settings
        WorkspaceAISettings.objects.create(
            workspace=workspace,
            ollama_base_url="http://custom-ollama:11434",
        )

        captured_url = {}

        def fake_get(url, **kwargs):
            captured_url["url"] = url
            mock_response = MagicMock()
            mock_response.json.return_value = {"models": []}
            mock_response.raise_for_status = MagicMock()
            return mock_response

        with patch("httpx.get", side_effect=fake_get):
            response = client.get("/api/v1/generation/ollama/models")

        assert response.status_code == 200
        assert "custom-ollama:11434" in captured_url.get("url", "")


# ---------------------------------------------------------------------------
# Stream chat with Ollama provider
# ---------------------------------------------------------------------------


class TestStreamChatWithOllama:
    def test_stream_chat_ollama_mock_yields_tokens(self):
        from apps.generation.chat_service import stream_chat

        messages = [{"role": "user", "content": "Create a post about Ollama"}]
        events = list(
            stream_chat(
                messages=messages,
                provider_key="ollama",
                project_id=None,
                fmt="ig_square",
                network="",
            )
        )
        event_types = [e.split("\n")[0] for e in events if e.strip()]
        assert "event: token" in event_types
        assert "event: done" in event_types
