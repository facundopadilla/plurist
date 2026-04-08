from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any

from .base import (
    APIKeyProvider,
    GenerationResult,
    make_error_result,
    make_success_result,
)

if TYPE_CHECKING:
    pass

_PROVIDER_NAME = "gemini"
_DEFAULT_MODEL = "gemini-1.5-pro"
_ENV_VAR = "GEMINI_API_KEY"
_ENC_FIELD = "gemini_api_key_enc"


class GeminiProvider(APIKeyProvider):
    """Google Gemini generation adapter.

    Uses a real API call when an API key is present (workspace settings or
    GEMINI_API_KEY env var); otherwise returns a deterministic mock so tests
    never hit the network.
    """

    provider_name = _PROVIDER_NAME
    default_model = _DEFAULT_MODEL
    env_var = _ENV_VAR
    enc_field = _ENC_FIELD
    mock_latency_ms = 15
    mock_token_count = 18

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            import httpx

            messages = context.get("messages")
            contents: list[dict[str, object]] = []
            system_instruction: dict[str, object] | None = None

            if not messages:
                contents = [{"parts": [{"text": prompt}]}]
            else:
                for m in messages:
                    # Gemini expects "user" or "model" roles
                    role = "model" if m["role"] == "assistant" else "user"
                    contents.append({"role": role, "parts": [{"text": m["content"]}]})
                system_instruction = {"parts": [{"text": prompt}]}

            payload: dict[str, object] = {"contents": contents}
            if system_instruction:
                payload["systemInstruction"] = system_instruction

            t0 = time.monotonic()
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.model_id}:generateContent?key={self._api_key}"
            )
            response = httpx.post(
                url,
                json=payload,
                timeout=30,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return make_success_result(
                _PROVIDER_NAME,
                self.model_id,
                text,
                latency_ms,
                0,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
