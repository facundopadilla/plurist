import pytest
from ninja.errors import HttpError

from apps.generation.providers.registry import get_provider, list_providers

pytestmark = pytest.mark.django_db


def test_registry_returns_all_known_providers():
    providers = list_providers()
    assert set(providers) == {"openai", "anthropic", "gemini", "openrouter"}


def test_get_provider_returns_instance_for_each_key():
    for key in list_providers():
        provider = get_provider(key)
        assert provider is not None


def test_get_provider_unknown_key_raises_422():
    with pytest.raises(HttpError) as exc_info:
        get_provider("unknown-provider")
    assert exc_info.value.status_code == 422


def test_each_provider_mock_generates_successfully():
    """All providers generate a successful result in mock mode (no real API keys)."""
    for key in list_providers():
        provider = get_provider(key)
        result = provider.generate("Write a post about our new product", {})
        assert result.success is True
        assert result.generated_text != ""
        assert result.provider_name == key
