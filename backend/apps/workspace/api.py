"""Workspace AI settings API.

Owner-only endpoints to read/write encrypted AI provider keys and preferences.
The GET response never returns plaintext keys — only boolean ``has_*_key``
flags so the frontend can show "key configured" without exposing secrets.
"""

from __future__ import annotations

from ninja import Router, Schema

from apps.accounts.auth import require_owner
from apps.accounts.models import Workspace
from apps.accounts.session_auth import session_auth as django_auth

from .crypto import AIKeyVault
from .models import WorkspaceAISettings

router = Router(tags=["workspace"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AISettingsOut(Schema):
    has_openai_key: bool
    has_anthropic_key: bool
    has_gemini_key: bool
    has_openrouter_key: bool
    ollama_base_url: str
    preferred_models: dict


class AISettingsIn(Schema):
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    ollama_base_url: str | None = None
    preferred_models: dict | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_or_create_settings(workspace: Workspace) -> WorkspaceAISettings:
    obj, _ = WorkspaceAISettings.objects.get_or_create(workspace=workspace)
    return obj


def _settings_to_out(obj: WorkspaceAISettings) -> AISettingsOut:
    return AISettingsOut(
        has_openai_key=bool(obj.openai_api_key_enc),
        has_anthropic_key=bool(obj.anthropic_api_key_enc),
        has_gemini_key=bool(obj.gemini_api_key_enc),
        has_openrouter_key=bool(obj.openrouter_api_key_enc),
        ollama_base_url=obj.ollama_base_url,
        preferred_models=obj.preferred_models or {},
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/ai-settings", auth=django_auth, response=AISettingsOut)
def get_ai_settings(request):
    """Return AI settings flags for the workspace (Owner only)."""
    membership = require_owner(request)
    obj = _get_or_create_settings(membership.workspace)
    return _settings_to_out(obj)


@router.put("/ai-settings", auth=django_auth, response=AISettingsOut)
def put_ai_settings(request, payload: AISettingsIn):
    """Update AI provider keys / preferences for the workspace (Owner only).

    Pass ``null`` to a key field to leave it unchanged.
    Pass an empty string ``""`` to **clear** a key.
    """
    from apps.accounts.api import _require_csrf

    _require_csrf(request)
    membership = require_owner(request)
    obj = _get_or_create_settings(membership.workspace)

    update_fields = ["updated_at"]

    if payload.openai_api_key is not None:
        obj.openai_api_key_enc = AIKeyVault.encrypt(payload.openai_api_key)
        update_fields.append("openai_api_key_enc")

    if payload.anthropic_api_key is not None:
        obj.anthropic_api_key_enc = AIKeyVault.encrypt(payload.anthropic_api_key)
        update_fields.append("anthropic_api_key_enc")

    if payload.gemini_api_key is not None:
        obj.gemini_api_key_enc = AIKeyVault.encrypt(payload.gemini_api_key)
        update_fields.append("gemini_api_key_enc")

    if payload.openrouter_api_key is not None:
        obj.openrouter_api_key_enc = AIKeyVault.encrypt(payload.openrouter_api_key)
        update_fields.append("openrouter_api_key_enc")

    if payload.ollama_base_url is not None:
        obj.ollama_base_url = payload.ollama_base_url
        update_fields.append("ollama_base_url")

    if payload.preferred_models is not None:
        obj.preferred_models = payload.preferred_models
        update_fields.append("preferred_models")

    obj.save(update_fields=update_fields)
    return _settings_to_out(obj)
