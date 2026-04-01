from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Iterator

from .base import (
    BaseProvider,
    GenerationResult,
    build_provider_messages,
    resolve_api_key,
)

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings

_PROVIDER_NAME = "openrouter"
_DEFAULT_MODEL = "openai/gpt-4o"
_ENV_VAR = "OPENROUTER_API_KEY"
_ENC_FIELD = "openrouter_api_key_enc"


class OpenRouterProvider(BaseProvider):
    """OpenRouter generation adapter.

    OpenRouter is treated as a standard provider adapter — it routes to various
    upstream models via a single OpenAI-compatible endpoint.

    Uses a real API call when an API key is present (workspace settings or
    OPENROUTER_API_KEY env var); otherwise returns a deterministic mock so
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

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        """Buffered fallback: OpenRouter streaming not implemented in this adapter."""
        result = self.generate(prompt, context)
        if result.success:
            yield result.generated_text
        else:
            raise RuntimeError(result.error_message or "OpenRouter generation failed")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _mock_result(self, prompt: str) -> GenerationResult:
        return GenerationResult(
            success=True,
            provider_name=_PROVIDER_NAME,
            model_id=self.model_id,
            generated_text=f"[openrouter-mock] {prompt[:80]}",
            template_variables={},
            latency_ms=11,
            token_count=21,
            cost_estimate=0.0,
        )

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            import httpx

            t0 = time.monotonic()
            response = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
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
            return GenerationResult(
                success=False,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                error_message=str(exc),
            )
