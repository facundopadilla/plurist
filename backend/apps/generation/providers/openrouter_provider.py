from __future__ import annotations

import os
import time
from typing import Any

from .base import BaseProvider, GenerationResult

_PROVIDER_NAME = "openrouter"
_DEFAULT_MODEL = "openai/gpt-4o"


class OpenRouterProvider(BaseProvider):
    """OpenRouter generation adapter.

    OpenRouter is treated as a standard provider adapter — it routes to various
    upstream models via a single OpenAI-compatible endpoint.

    Uses a real API call when OPENROUTER_API_KEY is present; otherwise returns a
    deterministic mock so tests never hit the network.
    """

    def __init__(self, model_id: str = _DEFAULT_MODEL) -> None:
        self.model_id = model_id
        self._api_key = os.environ.get("OPENROUTER_API_KEY", "")

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
                    "messages": [{"role": "user", "content": prompt}],
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
