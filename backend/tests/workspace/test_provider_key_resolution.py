"""Tests for workspace-key-over-env fallback in AI providers."""

from __future__ import annotations

from apps.workspace.crypto import AIKeyVault


class FakeAISettings:
    """Minimal stand-in for WorkspaceAISettings."""

    def __init__(self, **enc_fields):
        for k, v in enc_fields.items():
            setattr(self, k, v)
        # Default all fields to empty
        for field in [
            "openai_api_key_enc",
            "anthropic_api_key_enc",
            "gemini_api_key_enc",
            "openrouter_api_key_enc",
        ]:
            if not hasattr(self, field):
                setattr(self, field, "")


class TestResolveApiKey:
    def test_env_fallback_when_no_workspace_settings(self, monkeypatch):
        from apps.generation.providers.base import resolve_api_key

        monkeypatch.setenv("OPENAI_API_KEY", "env-key-123")
        assert resolve_api_key("OPENAI_API_KEY", "openai_api_key_enc", None) == "env-key-123"

    def test_workspace_key_takes_precedence_over_env(self, monkeypatch):
        from apps.generation.providers.base import resolve_api_key

        monkeypatch.setenv("OPENAI_API_KEY", "env-key-should-not-be-used")
        enc = AIKeyVault.encrypt("workspace-key-wins")
        settings = FakeAISettings(openai_api_key_enc=enc)
        result = resolve_api_key("OPENAI_API_KEY", "openai_api_key_enc", settings)
        assert result == "workspace-key-wins"

    def test_env_fallback_when_workspace_field_is_empty(self, monkeypatch):
        from apps.generation.providers.base import resolve_api_key

        monkeypatch.setenv("OPENAI_API_KEY", "env-fallback")
        settings = FakeAISettings(openai_api_key_enc="")
        result = resolve_api_key("OPENAI_API_KEY", "openai_api_key_enc", settings)
        assert result == "env-fallback"

    def test_returns_empty_when_neither_set(self, monkeypatch):
        from apps.generation.providers.base import resolve_api_key

        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        settings = FakeAISettings(openai_api_key_enc="")
        result = resolve_api_key("OPENAI_API_KEY", "openai_api_key_enc", settings)
        assert result == ""


class TestProviderUsesWorkspaceKey:
    def test_openai_uses_workspace_key(self):
        from apps.generation.providers.openai_provider import OpenAIProvider

        enc = AIKeyVault.encrypt("workspace-openai-key")
        settings = FakeAISettings(openai_api_key_enc=enc)
        provider = OpenAIProvider(workspace_settings=settings)
        assert provider._api_key == "workspace-openai-key"

    def test_anthropic_uses_workspace_key(self):
        from apps.generation.providers.anthropic_provider import AnthropicProvider

        enc = AIKeyVault.encrypt("workspace-anthropic-key")
        settings = FakeAISettings(anthropic_api_key_enc=enc)
        provider = AnthropicProvider(workspace_settings=settings)
        assert provider._api_key == "workspace-anthropic-key"

    def test_gemini_uses_workspace_key(self):
        from apps.generation.providers.gemini_provider import GeminiProvider

        enc = AIKeyVault.encrypt("workspace-gemini-key")
        settings = FakeAISettings(gemini_api_key_enc=enc)
        provider = GeminiProvider(workspace_settings=settings)
        assert provider._api_key == "workspace-gemini-key"

    def test_openrouter_uses_workspace_key(self):
        from apps.generation.providers.openrouter_provider import OpenRouterProvider

        enc = AIKeyVault.encrypt("workspace-openrouter-key")
        settings = FakeAISettings(openrouter_api_key_enc=enc)
        provider = OpenRouterProvider(workspace_settings=settings)
        assert provider._api_key == "workspace-openrouter-key"

    def test_provider_falls_back_to_env_when_no_workspace_settings(self, monkeypatch):
        from apps.generation.providers.openai_provider import OpenAIProvider

        monkeypatch.setenv("OPENAI_API_KEY", "env-openai-key")
        provider = OpenAIProvider(workspace_settings=None)
        assert provider._api_key == "env-openai-key"

    def test_registry_passes_workspace_settings_to_provider(self):
        from apps.generation.providers.registry import get_provider

        enc = AIKeyVault.encrypt("registry-test-key")
        settings = FakeAISettings(openai_api_key_enc=enc)
        provider = get_provider("openai", workspace_settings=settings)
        assert provider._api_key == "registry-test-key"
