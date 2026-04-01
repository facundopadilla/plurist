from __future__ import annotations

from django.db import models

from apps.accounts.models import Workspace


class WorkspaceAISettings(models.Model):
    """Stores encrypted AI provider API keys and preferences for the workspace.

    One row, always pk=1 (workspace is a singleton).
    Keys are stored encrypted via AIKeyVault; only has_*_key flags are exposed
    to the API.
    """

    workspace = models.OneToOneField(
        Workspace,
        on_delete=models.CASCADE,
        related_name="ai_settings",
        primary_key=True,
    )

    # Encrypted API keys (Fernet ciphertext stored as text)
    openai_api_key_enc = models.TextField(blank=True, default="")
    anthropic_api_key_enc = models.TextField(blank=True, default="")
    gemini_api_key_enc = models.TextField(blank=True, default="")
    openrouter_api_key_enc = models.TextField(blank=True, default="")

    # Ollama base URL (not encrypted — it's a URL, not a secret)
    ollama_base_url = models.CharField(max_length=500, blank=True, default="")

    # Preferred model per provider (e.g. {"openai": "gpt-4o", "anthropic": "claude-3-5-sonnet-..."})
    preferred_models = models.JSONField(default=dict, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Workspace AI Settings"

    def __str__(self) -> str:
        return f"AISettings for workspace {self.workspace_id}"
