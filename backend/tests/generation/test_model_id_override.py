"""
Tests for Phase 3: Provider model_id override.

Covers:
- request-level model_id passed through chat API → chat_service → provider
- workspace preferred_models used when request omits model_id
- provider default used when neither request model_id nor preferred_models set
- registry passes model_id to provider constructor
- all mock providers honour model_id override
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from apps.generation.providers.anthropic_provider import (
    _DEFAULT_MODEL as ANTHROPIC_DEFAULT,
)
from apps.generation.providers.anthropic_provider import AnthropicProvider
from apps.generation.providers.gemini_provider import _DEFAULT_MODEL as GEMINI_DEFAULT
from apps.generation.providers.gemini_provider import GeminiProvider
from apps.generation.providers.ollama_provider import _DEFAULT_MODEL as OLLAMA_DEFAULT
from apps.generation.providers.ollama_provider import OllamaProvider
from apps.generation.providers.openai_provider import _DEFAULT_MODEL as OPENAI_DEFAULT
from apps.generation.providers.openai_provider import OpenAIProvider
from apps.generation.providers.openrouter_provider import (
    _DEFAULT_MODEL as OPENROUTER_DEFAULT,
)
from apps.generation.providers.openrouter_provider import OpenRouterProvider
from apps.generation.providers.registry import get_provider

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Provider constructor — model_id override
# ---------------------------------------------------------------------------


class TestProviderModelIdOverride:
    """Each provider respects an explicit model_id passed at construction."""

    def test_openai_uses_passed_model_id(self):
        provider = OpenAIProvider(model_id="gpt-4o-mini")
        assert provider.model_id == "gpt-4o-mini"

    def test_openai_default_when_not_passed(self):
        provider = OpenAIProvider()
        assert provider.model_id == OPENAI_DEFAULT

    def test_anthropic_uses_passed_model_id(self):
        provider = AnthropicProvider(model_id="claude-3-haiku-20240307")
        assert provider.model_id == "claude-3-haiku-20240307"

    def test_anthropic_default_when_not_passed(self):
        provider = AnthropicProvider()
        assert provider.model_id == ANTHROPIC_DEFAULT

    def test_gemini_uses_passed_model_id(self):
        provider = GeminiProvider(model_id="gemini-1.5-flash")
        assert provider.model_id == "gemini-1.5-flash"

    def test_gemini_default_when_not_passed(self):
        provider = GeminiProvider()
        assert provider.model_id == GEMINI_DEFAULT

    def test_openrouter_uses_passed_model_id(self):
        provider = OpenRouterProvider(model_id="meta-llama/llama-3.1-70b-instruct")
        assert provider.model_id == "meta-llama/llama-3.1-70b-instruct"

    def test_openrouter_default_when_not_passed(self):
        provider = OpenRouterProvider()
        assert provider.model_id == OPENROUTER_DEFAULT

    def test_ollama_uses_passed_model_id(self):
        provider = OllamaProvider(model_id="mistral:latest")
        assert provider.model_id == "mistral:latest"

    def test_ollama_default_when_not_passed(self):
        provider = OllamaProvider()
        assert provider.model_id == OLLAMA_DEFAULT


# ---------------------------------------------------------------------------
# Registry — model_id forwarded
# ---------------------------------------------------------------------------


class TestRegistryModelIdForwarding:
    def test_registry_forwards_model_id_to_openai(self):
        provider = get_provider("openai", model_id="gpt-4o-mini")
        assert provider.model_id == "gpt-4o-mini"

    def test_registry_forwards_model_id_to_anthropic(self):
        provider = get_provider("anthropic", model_id="claude-3-haiku-20240307")
        assert provider.model_id == "claude-3-haiku-20240307"

    def test_registry_forwards_model_id_to_gemini(self):
        provider = get_provider("gemini", model_id="gemini-1.5-flash")
        assert provider.model_id == "gemini-1.5-flash"

    def test_registry_forwards_model_id_to_openrouter(self):
        provider = get_provider("openrouter", model_id="openai/gpt-4o")
        assert provider.model_id == "openai/gpt-4o"

    def test_registry_forwards_model_id_to_ollama(self):
        provider = get_provider("ollama", model_id="phi3:mini")
        assert provider.model_id == "phi3:mini"

    def test_registry_uses_provider_default_when_no_model_id(self):
        provider = get_provider("openai")
        assert provider.model_id == OPENAI_DEFAULT

    def test_registry_ignores_empty_string_model_id(self):
        """Empty string should not override — provider gets its default."""
        provider = get_provider("openai", model_id="")
        # Empty string is falsy → registry doesn't pass it
        assert provider.model_id == OPENAI_DEFAULT


# ---------------------------------------------------------------------------
# Provider mock generate — model_id reflected in result
# ---------------------------------------------------------------------------


class TestProviderMockGenerateReflectsModelId:
    """Mock-mode generate() puts the overridden model_id in GenerationResult."""

    def test_openai_mock_result_has_custom_model_id(self):
        provider = OpenAIProvider(model_id="gpt-4o-mini")
        result = provider.generate("Hello", {})
        assert result.model_id == "gpt-4o-mini"

    def test_anthropic_mock_result_has_custom_model_id(self):
        provider = AnthropicProvider(model_id="claude-3-haiku-20240307")
        result = provider.generate("Hello", {})
        assert result.model_id == "claude-3-haiku-20240307"

    def test_gemini_mock_result_has_custom_model_id(self):
        provider = GeminiProvider(model_id="gemini-1.5-flash")
        result = provider.generate("Hello", {})
        assert result.model_id == "gemini-1.5-flash"

    def test_openrouter_mock_result_has_custom_model_id(self):
        provider = OpenRouterProvider(model_id="openai/gpt-4o")
        result = provider.generate("Hello", {})
        assert result.model_id == "openai/gpt-4o"

    def test_ollama_mock_result_has_custom_model_id(self):
        provider = OllamaProvider(model_id="phi3:mini")
        result = provider.generate("Hello", {})
        assert result.model_id == "phi3:mini"


# ---------------------------------------------------------------------------
# stream_chat — model_id override via request parameter
# ---------------------------------------------------------------------------


class TestStreamChatModelIdOverride:
    """chat_service.stream_chat passes request model_id to the provider."""

    def _collect_events(self, events):
        """Parse SSE events into list of (type, data) tuples."""
        parsed = []
        for event_str in events:
            lines = event_str.strip().split("\n")
            event_type = ""
            data_str = ""
            for line in lines:
                if line.startswith("event: "):
                    event_type = line[7:]
                elif line.startswith("data: "):
                    data_str = line[6:]
            if event_type and data_str:
                parsed.append((event_type, json.loads(data_str)))
        return parsed

    def test_stream_chat_uses_request_model_id(self):
        """When model_id is passed, stream yields tokens and done event."""
        from apps.generation.chat_service import stream_chat

        messages = [{"role": "user", "content": "Write a short caption"}]
        events = list(
            stream_chat(
                messages=messages,
                provider_key="openai",
                model_id="gpt-4o-mini",
                project_id=None,
                fmt="ig_square",
                network="",
            )
        )
        event_types = [e.split("\n")[0] for e in events if e.strip()]
        assert "event: token" in event_types
        assert "event: done" in event_types

    def test_stream_chat_works_without_model_id(self):
        """When model_id is None, stream still works using provider default."""
        from apps.generation.chat_service import stream_chat

        messages = [{"role": "user", "content": "Write a short caption"}]
        events = list(
            stream_chat(
                messages=messages,
                provider_key="openai",
                model_id=None,
                project_id=None,
                fmt="ig_square",
                network="",
            )
        )
        event_types = [e.split("\n")[0] for e in events if e.strip()]
        assert "event: token" in event_types
        assert "event: done" in event_types

    def test_stream_chat_uses_preferred_model_from_workspace(self, monkeypatch):
        """When model_id is None but workspace has preferred_models, that model is used."""
        from apps.generation.chat_service import stream_chat
        from apps.generation.providers.registry import get_provider as real_get_provider

        captured_model_id = {}

        def fake_get_provider(key, workspace_settings=None, model_id=None):
            captured_model_id["model_id"] = model_id
            return real_get_provider(key, workspace_settings=workspace_settings, model_id=model_id)

        # Build a fake workspace_settings object
        fake_ws = MagicMock()
        fake_ws.preferred_models = {"openai": "gpt-4o-mini"}

        # Patch Workspace.objects.first() to return something so WorkspaceAISettings lookup runs
        fake_workspace = MagicMock()

        def fake_ws_objects_first():
            return fake_workspace

        # Patch WorkspaceAISettings.objects.filter(...).first()
        class FakeWSFilter:
            def first(self):
                return fake_ws

        monkeypatch.setattr(
            "apps.generation.providers.registry.get_provider",
            fake_get_provider,
        )

        # Directly test the logic: if model_id=None and workspace has preferred_models
        # stream_chat resolves preferred model from workspace
        with monkeypatch.context() as m:
            import apps.accounts.models as acc_models
            import apps.workspace.models as ws_models

            m.setattr(acc_models.Workspace.objects, "first", fake_ws_objects_first)
            m.setattr(
                ws_models.WorkspaceAISettings.objects,
                "filter",
                lambda **kwargs: FakeWSFilter(),
            )

            messages = [{"role": "user", "content": "Caption about coffee"}]
            list(
                stream_chat(
                    messages=messages,
                    provider_key="openai",
                    model_id=None,
                    project_id=None,
                    fmt="ig_square",
                    network="",
                )
            )

        assert captured_model_id.get("model_id") == "gpt-4o-mini"


# ---------------------------------------------------------------------------
# Chat stream API endpoint — model_id accepted in payload
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


def _make_editor():
    from tests.accounts.factories import (
        MembershipFactory,
        UserFactory,
        WorkspaceFactory,
    )

    workspace = WorkspaceFactory()
    user = UserFactory(email="model_id_editor@test.example", password="testpassword123")
    MembershipFactory(user=user, workspace=workspace, role="editor")
    return workspace, user


class TestChatStreamModelIdEndpoint:
    def test_chat_stream_accepts_model_id_field(self, client):
        """POST /generation/chat/stream should accept model_id without 422."""
        _, user = _make_editor()
        _login(client, user.email)
        csrf = _csrf(client)

        response = client.post(
            "/api/v1/generation/chat/stream",
            data={
                "messages": [{"role": "user", "content": "Hello"}],
                "provider": "openai",
                "model_id": "gpt-4o-mini",
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        # Should succeed (200) with SSE stream
        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/event-stream")

    def test_chat_stream_without_model_id_still_works(self, client):
        """POST without model_id (omitted) should succeed."""
        _, user = _make_editor()
        _login(client, user.email)
        csrf = _csrf(client)

        response = client.post(
            "/api/v1/generation/chat/stream",
            data={
                "messages": [{"role": "user", "content": "Hello"}],
                "provider": "openai",
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 200

    def test_chat_stream_null_model_id_still_works(self, client):
        """POST with explicit null model_id should succeed."""
        _, user = _make_editor()
        _login(client, user.email)
        csrf = _csrf(client)

        response = client.post(
            "/api/v1/generation/chat/stream",
            data={
                "messages": [{"role": "user", "content": "Hello"}],
                "provider": "openai",
                "model_id": None,
            },
            content_type="application/json",
            HTTP_X_CSRF_TOKEN=csrf,
        )
        assert response.status_code == 200
