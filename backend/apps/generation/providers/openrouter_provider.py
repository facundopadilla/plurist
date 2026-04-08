from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .base import (
    APIKeyProvider,
    GenerationResult,
    make_error_result,
    request_openai_compatible_result,
)

if TYPE_CHECKING:
    pass

_PROVIDER_NAME = "openrouter"
_DEFAULT_MODEL = "openai/gpt-4o"
_ENV_VAR = "OPENROUTER_API_KEY"
_ENC_FIELD = "openrouter_api_key_enc"


class OpenRouterProvider(APIKeyProvider):
    """OpenRouter generation adapter.

    OpenRouter is treated as a standard provider adapter — it routes to various
    upstream models via a single OpenAI-compatible endpoint.

    Uses a real API call when an API key is present (workspace settings or
    OPENROUTER_API_KEY env var); otherwise returns a deterministic mock so
    tests never hit the network.
    """

    provider_name = _PROVIDER_NAME
    default_model = _DEFAULT_MODEL
    env_var = _ENV_VAR
    enc_field = _ENC_FIELD
    mock_latency_ms = 11
    mock_token_count = 21

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            return request_openai_compatible_result(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                prompt=prompt,
                context=context,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
