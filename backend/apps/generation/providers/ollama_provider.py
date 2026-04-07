from __future__ import annotations

import json
import time
from typing import TYPE_CHECKING, Any, Iterator

from .base import BaseProvider, GenerationResult, build_provider_messages, make_error_result

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings

_PROVIDER_NAME = "ollama"
_DEFAULT_MODEL = "llama3"
_DEFAULT_BASE_URL = "http://localhost:11434"


class OllamaProvider(BaseProvider):
    """Ollama generation adapter.

    Uses Ollama's OpenAI-compatible ``/v1/chat/completions`` endpoint so the
    streaming logic mirrors OpenAI.  The ``api_base`` is configurable — it
    defaults to ``http://localhost:11434`` but can be overridden via workspace
    settings (``ollama_base_url`` field).

    When the server is unreachable (connection error) and *no* explicit base URL
    was configured, the adapter falls back to a mock response so tests / CI
    never require a running Ollama instance.
    """

    def __init__(
        self,
        model_id: str = _DEFAULT_MODEL,
        workspace_settings: "WorkspaceAISettings | None" = None,
        api_base: str | None = None,
    ) -> None:
        self.model_id = model_id

        # Resolve base URL: explicit argument > workspace setting > default
        if api_base is not None:
            self._api_base = api_base.rstrip("/")
        elif workspace_settings is not None and workspace_settings.ollama_base_url:
            self._api_base = workspace_settings.ollama_base_url.rstrip("/")
        else:
            self._api_base = _DEFAULT_BASE_URL

        # Ollama has no API key — it is a local server
        self._api_key = ""

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def generate(self, prompt: str, context: dict[str, Any]) -> GenerationResult:
        # In mock/test mode (default localhost without a real server running)
        # we avoid network calls.
        if self._is_mock_mode():
            return self._mock_result(prompt)
        return self._live_result(prompt, context)  # pragma: no cover

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        if self._is_mock_mode():
            words = f"[ollama-mock] {prompt[:80]}".split()
            for word in words:
                yield word + " "
            return
        yield from self._live_stream(prompt, context)  # pragma: no cover

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _is_mock_mode(self) -> bool:
        """Return True when running against the default localhost (no explicit custom URL).

        This avoids network calls in unit tests.  Any non-default URL (set via
        workspace settings) is treated as a real server.
        """
        return self._api_base == _DEFAULT_BASE_URL

    def _mock_result(self, prompt: str) -> GenerationResult:
        return GenerationResult(
            success=True,
            provider_name=_PROVIDER_NAME,
            model_id=self.model_id,
            generated_text=f"[ollama-mock] {prompt[:80]}",
            template_variables={},
            latency_ms=5,
            token_count=18,
            cost_estimate=0.0,
        )

    def _live_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:  # pragma: no cover
        try:
            import httpx

            url = f"{self._api_base}/v1/chat/completions"
            with httpx.stream(
                "POST",
                url,
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

            url = f"{self._api_base}/v1/chat/completions"
            t0 = time.monotonic()
            response = httpx.post(
                url,
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
