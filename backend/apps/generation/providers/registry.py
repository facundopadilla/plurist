from __future__ import annotations

from ninja.errors import HttpError

from .anthropic_provider import AnthropicProvider
from .base import BaseProvider
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider
from .openrouter_provider import OpenRouterProvider

_REGISTRY: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "openrouter": OpenRouterProvider,
}


def get_provider(key: str) -> BaseProvider:
    """Return an instantiated provider for the given key.

    Raises HttpError 422 for unknown keys so callers can propagate this to the
    API layer without additional wrapping.
    """
    cls = _REGISTRY.get(key)
    if cls is None:
        raise HttpError(422, f"Unknown provider: {key!r}")
    return cls()


def list_providers() -> list[str]:
    """Return all registered provider keys."""
    return list(_REGISTRY.keys())
