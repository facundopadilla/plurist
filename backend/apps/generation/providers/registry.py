from __future__ import annotations

from typing import TYPE_CHECKING

from ninja.errors import HttpError

from .anthropic_provider import AnthropicProvider
from .base import BaseProvider
from .gemini_provider import GeminiProvider
from .ollama_provider import OllamaProvider
from .openai_provider import OpenAIProvider
from .openrouter_provider import OpenRouterProvider

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings

_REGISTRY: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "openrouter": OpenRouterProvider,
    "ollama": OllamaProvider,
}


def get_provider(
    key: str,
    workspace_settings: "WorkspaceAISettings | None" = None,
    model_id: str | None = None,
) -> BaseProvider:
    """Return an instantiated provider for the given key.

    *workspace_settings* is forwarded to the provider constructor so it can
    resolve API keys from the workspace before falling back to env vars.

    *model_id* overrides the provider's hardcoded default model when provided.
    When None, the provider uses its own default.

    Raises HttpError 422 for unknown keys so callers can propagate this to the
    API layer without additional wrapping.
    """
    cls = _REGISTRY.get(key)
    if cls is None:
        raise HttpError(422, f"Unknown provider: {key!r}")
    kwargs: dict = {"workspace_settings": workspace_settings}
    if model_id:
        kwargs["model_id"] = model_id
    return cls(**kwargs)


def list_providers() -> list[str]:
    """Return all registered provider keys."""
    return list(_REGISTRY.keys())
