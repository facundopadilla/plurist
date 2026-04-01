from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Iterator

from .base import (
    BaseProvider,
    GenerationResult,
    resolve_api_key,
)

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings

_PROVIDER_NAME = "gemini"
_DEFAULT_MODEL = "gemini-1.5-pro"
_ENV_VAR = "GEMINI_API_KEY"
_ENC_FIELD = "gemini_api_key_enc"


class GeminiProvider(BaseProvider):
    """Google Gemini generation adapter.

    Uses a real API call when an API key is present (workspace settings or
    GEMINI_API_KEY env var); otherwise returns a deterministic mock so tests
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

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        """Buffered fallback: Gemini does not support token streaming in this adapter."""
        result = self.generate(prompt, context)
        if result.success:
            yield result.generated_text
        else:
            raise RuntimeError(result.error_message or "Gemini generation failed")

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
