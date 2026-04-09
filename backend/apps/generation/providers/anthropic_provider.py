from __future__ import annotations

import json
import time
from typing import TYPE_CHECKING, Any, Iterator

import httpx

from .base import (
    APIKeyProvider,
    GenerationResult,
    iter_mock_stream,
    make_error_result,
    make_success_result,
    raise_provider_error,
)

if TYPE_CHECKING:
    pass

_PROVIDER_NAME = "anthropic"
_DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
_ENV_VAR = "ANTHROPIC_API_KEY"
_ENC_FIELD = "anthropic_api_key_enc"


class AnthropicProvider(APIKeyProvider):
    """Anthropic generation adapter.

    Uses a real API call when an API key is present (workspace settings or
    ANTHROPIC_API_KEY env var); otherwise returns a deterministic mock so
    tests never hit the network.
    """

    provider_name = _PROVIDER_NAME
    default_model = _DEFAULT_MODEL
    env_var = _ENV_VAR
    enc_field = _ENC_FIELD
    mock_latency_ms = 12
    mock_token_count = 22

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        if self._is_mock_mode():
            yield from iter_mock_stream(_PROVIDER_NAME, prompt)
            return
        yield from self._live_stream(prompt, context)  # pragma: no cover

    def _live_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:  # pragma: no cover
        try:
            messages = context.get("messages")
            if not messages:
                messages = [{"role": "user", "content": prompt}]
                system = None
            else:
                system = prompt

            payload = {
                "model": self.model_id,
                "max_tokens": 4096,
                "messages": messages,
                "stream": True,
            }
            if system:
                payload["system"] = system

            with httpx.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": "2023-06-01",
                },
                json=payload,
                timeout=60,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    chunk = json.loads(data)
                    if chunk.get("type") == "content_block_delta":
                        text = chunk.get("delta", {}).get("text", "")
                        if text:
                            yield text
        except Exception as exc:
            raise_provider_error(exc, _PROVIDER_NAME)

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            messages = context.get("messages")
            if not messages:
                messages = [{"role": "user", "content": prompt}]
                system = None
            else:
                system = prompt

            payload = {
                "model": self.model_id,
                "max_tokens": 1024,
                "messages": messages,
            }
            if system:
                payload["system"] = system

            t0 = time.monotonic()
            response = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": "2023-06-01",
                },
                json=payload,
                timeout=30,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            usage = data.get("usage", {})
            token_count = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
            return make_success_result(
                _PROVIDER_NAME,
                self.model_id,
                text,
                latency_ms,
                token_count,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
