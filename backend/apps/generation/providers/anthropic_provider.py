from __future__ import annotations

import os
import time
from typing import Any

from .base import BaseProvider, GenerationResult

_PROVIDER_NAME = "anthropic"
_DEFAULT_MODEL = "claude-3-5-sonnet-20241022"


class AnthropicProvider(BaseProvider):
    """Anthropic generation adapter.

    Uses a real API call when ANTHROPIC_API_KEY is present; otherwise returns a
    deterministic mock so tests never hit the network.
    """

    def __init__(self, model_id: str = _DEFAULT_MODEL) -> None:
        self.model_id = model_id
        self._api_key = os.environ.get("ANTHROPIC_API_KEY", "")

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

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            import httpx

            t0 = time.monotonic()
            response = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": self.model_id,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
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
            return GenerationResult(
                success=False,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                error_message=str(exc),
            )
