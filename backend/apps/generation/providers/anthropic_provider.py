from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Iterator

from .base import BaseProvider, GenerationResult, make_error_result, resolve_api_key

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings

_PROVIDER_NAME = "anthropic"
_DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
_ENV_VAR = "ANTHROPIC_API_KEY"
_ENC_FIELD = "anthropic_api_key_enc"


class AnthropicProvider(BaseProvider):
    """Anthropic generation adapter.

    Uses a real API call when an API key is present (workspace settings or
    ANTHROPIC_API_KEY env var); otherwise returns a deterministic mock so
    tests never hit the network.
    """

    def __init__(
        self,
        model_id: str = _DEFAULT_MODEL,
        workspace_settings: "WorkspaceAISettings | None" = None,
    ) -> None:
        self.model_id = model_id
        self._api_key = resolve_api_key(_ENV_VAR, _ENC_FIELD, workspace_settings)

    def generate(self, prompt: str, context: dict[str, Any]) -> GenerationResult:
        if not self._api_key or self._api_key.startswith("mock"):
            return self._mock_result(prompt)
        return self._live_result(prompt, context)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _mock_result(self, prompt: str) -> GenerationResult:
        return GenerationResult(
            success=True,
            provider_name=_PROVIDER_NAME,
            model_id=self.model_id,
            generated_text=f"[anthropic-mock] {prompt[:80]}",
            template_variables={},
            latency_ms=12,
            token_count=22,
            cost_estimate=0.0,
        )

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        if not self._api_key or self._api_key.startswith("mock"):
            # Mock: yield word-by-word
            words = f"[anthropic-mock] {prompt[:80]}".split()
            for word in words:
                yield word + " "
            return
        yield from self._live_stream(prompt, context)  # pragma: no cover

    def _live_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:  # pragma: no cover
        try:
            import json

            import httpx

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
            from .errors import ProviderError, classify_provider_error

            classified = classify_provider_error(exc, _PROVIDER_NAME)
            raise ProviderError(
                message=classified.message,
                code=classified.code,
                category=classified.category,
                hint=classified.hint,
                retryable=classified.retryable,
                provider=_PROVIDER_NAME,
            ) from exc

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            import httpx

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
            return GenerationResult(
                success=True,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                generated_text=text,
                template_variables={},
                latency_ms=latency_ms,
                token_count=token_count,
                cost_estimate=0.0,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
