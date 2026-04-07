from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Iterator

from .base import (
    BaseProvider,
    GenerationResult,
    build_provider_messages,
    make_error_result,
    resolve_api_key,
)

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings

_PROVIDER_NAME = "openai"
_DEFAULT_MODEL = "gpt-4o"
_ENV_VAR = "OPENAI_API_KEY"
_ENC_FIELD = "openai_api_key_enc"


class OpenAIProvider(BaseProvider):
    """OpenAI generation adapter.

    Uses a real API call when an API key is present (workspace settings or
    OPENAI_API_KEY env var); otherwise returns a deterministic mock so tests
    never hit the network.
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
            generated_text=f"[openai-mock] {prompt[:80]}",
            template_variables={},
            latency_ms=10,
            token_count=20,
            cost_estimate=0.0,
        )

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        if not self._api_key or self._api_key.startswith("mock"):
            # Mock: yield word-by-word
            words = f"[openai-mock] {prompt[:80]}".split()
            for word in words:
                yield word + " "
            return
        yield from self._live_stream(prompt, context)  # pragma: no cover

    def _live_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:  # pragma: no cover
        try:
            import httpx

            with httpx.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "model": self.model_id,
                    "messages": build_provider_messages(prompt, context),
                    "stream": True,
                },
                timeout=60,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    import json

                    chunk = json.loads(data)
                    delta = chunk["choices"][0].get("delta", {})
                    text = delta.get("content", "")
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

            t0 = time.monotonic()
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "model": self.model_id,
                    "messages": build_provider_messages(prompt, context),
                },
                timeout=30,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return GenerationResult(
                success=True,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                generated_text=text,
                template_variables={},
                latency_ms=latency_ms,
                token_count=usage.get("total_tokens", 0),
                cost_estimate=0.0,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
