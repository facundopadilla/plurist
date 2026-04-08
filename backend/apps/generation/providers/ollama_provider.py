from __future__ import annotations

from typing import TYPE_CHECKING, Any, Iterator

from .base import (
    BaseProvider,
    GenerationResult,
    iter_mock_stream,
    make_error_result,
    make_mock_result,
    request_openai_compatible_result,
    stream_openai_compatible_result,
)

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
            yield from iter_mock_stream(_PROVIDER_NAME, prompt)
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
        return make_mock_result(_PROVIDER_NAME, self.model_id, prompt, 5, 18)

    def _live_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:  # pragma: no cover
        yield from stream_openai_compatible_result(
            url=f"{self._api_base}/v1/chat/completions",
            headers=None,
            provider_name=_PROVIDER_NAME,
            model_id=self.model_id,
            prompt=prompt,
            context=context,
        )

    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:  # pragma: no cover
        try:
            return request_openai_compatible_result(
                url=f"{self._api_base}/v1/chat/completions",
                headers=None,
                provider_name=_PROVIDER_NAME,
                model_id=self.model_id,
                prompt=prompt,
                context=context,
            )
        except Exception as exc:
            return make_error_result(exc, _PROVIDER_NAME, self.model_id)
