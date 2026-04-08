from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Iterator

if TYPE_CHECKING:
    from apps.workspace.models import WorkspaceAISettings


@dataclass
class GenerationResult:
    success: bool
    provider_name: str
    model_id: str
    generated_text: str = ""
    template_variables: dict[str, Any] = field(default_factory=dict)
    latency_ms: int = 0
    token_count: int = 0
    cost_estimate: float = 0.0
    error_message: str = ""
    error_code: str = ""  # e.g. "rate_limited", "auth_invalid"
    error_category: str = ""  # e.g. "limit", "auth", "provider"
    error_hint: str = ""  # Actionable suggestion for the user
    error_retryable: bool = False


def resolve_api_key(
    env_var: str,
    enc_field: str,
    workspace_settings: "WorkspaceAISettings | None" = None,
) -> str:
    """Return the API key for a provider.

    Resolution order:
    1. Workspace AI settings (decrypted from DB) if *workspace_settings* given
       and the encrypted field is set.
    2. Environment variable *env_var*.
    """
    if workspace_settings is not None:
        from apps.workspace.crypto import AIKeyVault

        enc = getattr(workspace_settings, enc_field, "")
        if enc:
            return AIKeyVault.decrypt(enc)
    return os.environ.get(env_var, "")


def build_provider_messages(prompt: str, context: dict[str, Any]) -> list[dict[str, str]]:
    """Build the final messages array for a provider API call.

    If 'messages' is in context (e.g. from a chat stream), the 'prompt'
    is used as the first system message, followed by the conversation history.
    Otherwise, defaults to a single user message containing the prompt.
    """
    messages = context.get("messages")
    mode = context.get("mode")
    if messages and isinstance(messages, list):
        if mode == "plan":
            filtered_messages: list[dict[str, str]] = []
            for message in messages:
                role = message.get("role")
                content = message.get("content", "")

                if role == "assistant" and _contains_html_like_content(content):
                    continue

                filtered_messages.append(message)

            messages = filtered_messages

        return [{"role": "system", "content": prompt}] + messages

    return [{"role": "user", "content": prompt}]


def _contains_html_like_content(content: str) -> bool:
    lowered = content.lower()
    html_tags = ("<html", "<body", "<div", "<section", "<p", "<h1", "<h2", "<h3", "<style", "<svg", "<figure")
    return any(tag in lowered for tag in html_tags)


def make_error_result(
    exc: Exception,
    provider_name: str,
    model_id: str,
) -> GenerationResult:
    """Create a GenerationResult with structured error info from an exception."""
    from .errors import classify_provider_error

    classified = classify_provider_error(exc, provider_name)
    return GenerationResult(
        success=False,
        provider_name=provider_name,
        model_id=model_id,
        error_message=classified.message,
        error_code=classified.code,
        error_category=classified.category,
        error_hint=classified.hint,
        error_retryable=classified.retryable,
    )


def make_success_result(
    provider_name: str,
    model_id: str,
    generated_text: str,
    latency_ms: int,
    token_count: int,
) -> GenerationResult:
    return GenerationResult(
        success=True,
        provider_name=provider_name,
        model_id=model_id,
        generated_text=generated_text,
        template_variables={},
        latency_ms=latency_ms,
        token_count=token_count,
        cost_estimate=0.0,
    )


def make_mock_result(
    provider_name: str,
    model_id: str,
    prompt: str,
    latency_ms: int,
    token_count: int,
) -> GenerationResult:
    return make_success_result(
        provider_name,
        model_id,
        f"[{provider_name}-mock] {prompt[:80]}",
        latency_ms,
        token_count,
    )


def iter_mock_stream(provider_name: str, prompt: str) -> Iterator[str]:
    words = f"[{provider_name}-mock] {prompt[:80]}".split()
    for word in words:
        yield word + " "


def raise_provider_error(exc: Exception, provider_name: str) -> None:
    from .errors import ProviderError, classify_provider_error

    classified = classify_provider_error(exc, provider_name)
    raise ProviderError(
        message=classified.message,
        code=classified.code,
        category=classified.category,
        hint=classified.hint,
        retryable=classified.retryable,
        provider=provider_name,
    ) from exc


class BaseProvider(ABC):
    """Abstract base interface for all generation providers."""

    @abstractmethod
    def generate(self, prompt: str, context: dict[str, Any]) -> GenerationResult:
        """Run generation and return a normalised GenerationResult."""
        ...

    def generate_stream(self, prompt: str, context: dict[str, Any]) -> Iterator[str]:
        """Stream generation tokens. Default: buffered fallback via generate()."""
        result = self.generate(prompt, context)
        if result.success:
            yield result.generated_text
        else:
            from .errors import ProviderError

            raise ProviderError(
                message=result.error_message,
                code=result.error_code,
                category=result.error_category,
                hint=result.error_hint,
                retryable=result.error_retryable,
                provider=result.provider_name,
            )


class APIKeyProvider(BaseProvider):
    """Shared provider behavior for adapters backed by an API key."""

    provider_name: str = ""
    default_model: str = ""
    env_var: str = ""
    enc_field: str = ""
    mock_latency_ms: int = 10
    mock_token_count: int = 20

    def __init__(
        self,
        model_id: str | None = None,
        workspace_settings: "WorkspaceAISettings | None" = None,
    ) -> None:
        self.model_id = model_id or self.default_model
        self._api_key = resolve_api_key(self.env_var, self.enc_field, workspace_settings)

    def _is_mock_mode(self) -> bool:
        return not self._api_key or self._api_key.startswith("mock")

    def generate(self, prompt: str, context: dict[str, Any]) -> GenerationResult:
        if self._is_mock_mode():
            return self._mock_result(prompt)
        return self._live_result(prompt, context)

    def _mock_result(self, prompt: str) -> GenerationResult:
        return make_mock_result(
            self.provider_name,
            self.model_id,
            prompt,
            self.mock_latency_ms,
            self.mock_token_count,
        )

    @abstractmethod
    def _live_result(self, prompt: str, context: dict[str, Any]) -> GenerationResult:
        """Provider-specific live request implementation."""


def _openai_compatible_payload(
    model_id: str,
    prompt: str,
    context: dict[str, Any],
    *,
    stream: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model_id,
        "messages": build_provider_messages(prompt, context),
    }
    if stream:
        payload["stream"] = True
    return payload


def request_openai_compatible_result(
    *,
    url: str,
    headers: dict[str, str] | None,
    provider_name: str,
    model_id: str,
    prompt: str,
    context: dict[str, Any],
    timeout: int = 30,
) -> GenerationResult:
    import time

    import httpx

    t0 = time.monotonic()
    response = httpx.post(
        url,
        headers=headers,
        json=_openai_compatible_payload(model_id, prompt, context),
        timeout=timeout,
    )
    latency_ms = int((time.monotonic() - t0) * 1000)
    response.raise_for_status()
    data = response.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return make_success_result(
        provider_name,
        model_id,
        text,
        latency_ms,
        usage.get("total_tokens", 0),
    )


def stream_openai_compatible_result(
    *,
    url: str,
    headers: dict[str, str] | None,
    provider_name: str,
    model_id: str,
    prompt: str,
    context: dict[str, Any],
    timeout: int = 60,
) -> Iterator[str]:
    import json

    import httpx

    try:
        with httpx.stream(
            "POST",
            url,
            headers=headers,
            json=_openai_compatible_payload(model_id, prompt, context, stream=True),
            timeout=timeout,
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
        raise_provider_error(exc, provider_name)
