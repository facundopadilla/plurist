from __future__ import annotations

import os
import time
from typing import Any

from .base import BaseProvider, GenerationResult

_PROVIDER_NAME = "gemini"
_DEFAULT_MODEL = "gemini-1.5-pro"


class GeminiProvider(BaseProvider):
    """Google Gemini generation adapter.

    Uses a real API call when GEMINI_API_KEY is present; otherwise returns a
    deterministic mock so tests never hit the network.
    """

    def __init__(self, model_id: str = _DEFAULT_MODEL) -> None:
        self.model_id = model_id
        self._api_key = os.environ.get("GEMINI_API_KEY", "")

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
            generated_text=f"[gemini-mock] {prompt[:80]}",
            template_variables={},
            latency_ms=15,
            token_count=18,
            cost_estimate=0.0,
        )

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            import httpx

            t0 = time.monotonic()
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.model_id}:generateContent?key={self._api_key}"
            )
            response = httpx.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return GenerationResult(
                success=True,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                generated_text=text,
                template_variables={},
                latency_ms=latency_ms,
                token_count=0,
                cost_estimate=0.0,
            )
        except Exception as exc:
            return GenerationResult(
                success=False,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                error_message=str(exc),
            )
