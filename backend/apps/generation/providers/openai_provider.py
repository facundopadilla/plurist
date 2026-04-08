from __future__ import annotations

from typing import TYPE_CHECKING, Any, Iterator

from .base import (
    APIKeyProvider,
    GenerationResult,
    iter_mock_stream,
    make_error_result,
    request_openai_compatible_result,
    stream_openai_compatible_result,
)

if TYPE_CHECKING:
    pass

_PROVIDER_NAME = "openai"
_DEFAULT_MODEL = "gpt-4o"
_ENV_VAR = "OPENAI_API_KEY"
_ENC_FIELD = "openai_api_key_enc"


class OpenAIProvider(APIKeyProvider):
    """OpenAI generation adapter.

    Uses a real API call when an API key is present (workspace settings or
    OPENAI_API_KEY env var); otherwise returns a deterministic mock so tests
    never hit the network.
    """

    provider_name = _PROVIDER_NAME
    default_model = _DEFAULT_MODEL
    env_var = _ENV_VAR
    enc_field = _ENC_FIELD
    mock_latency_ms = 10
    mock_token_count = 20

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        if self._is_mock_mode():
            yield from iter_mock_stream(_PROVIDER_NAME, prompt)
            return
        yield from self._live_stream(prompt, context)  # pragma: no cover

    def _live_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:  # pragma: no cover
        yield from stream_openai_compatible_result(
            url="https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            provider_name=_PROVIDER_NAME,
            model_id=self.model_id,
            prompt=prompt,
            context=context,
        )

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            return request_openai_compatible_result(
                url="https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                prompt=prompt,
                context=context,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
