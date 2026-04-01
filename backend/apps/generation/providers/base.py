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
            raise RuntimeError(result.error_message or "Generation failed")
