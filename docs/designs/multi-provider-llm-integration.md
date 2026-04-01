# Design: Multi-Provider LLM Integration (BYOK + Ollama + Model Selection)

## Technical Approach

Extend the existing provider architecture with workspace-scoped configuration. A new `WorkspaceAISettings` model (one-to-one with the singleton `Workspace`) stores Fernet-encrypted API keys and Ollama config. Providers gain an optional `api_key`/`model_id` constructor injection — the registry resolves these from workspace settings first, then falls back to `os.environ`. The existing `TokenVault` in `apps/integrations/crypto.py` is reused (with a separate salt) for encryption. Ollama joins the registry as an OpenAI-compatible provider pointing at a user-configured base URL.

## Architecture Decisions

| Decision                       | Choice                                                                                                                                           | Alternatives                                                       | Rationale                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Encryption mechanism           | Reuse `cryptography.Fernet` via a new `AIKeyVault` class sharing `_build_fernet()` pattern with a distinct PBKDF2 salt (`b"socialclaw-ai-keys"`) | Store keys as plaintext; use Django's `SECRET_KEY` directly        | Fernet is already a project dependency. Separate salt isolates AI keys from social tokens — compromise of one doesn't affect the other. |
| Key storage granularity        | One encrypted `TextField` per provider (`openai_api_key_enc`, etc.)                                                                              | Single JSON blob with all keys encrypted together                  | Per-column allows clearing one provider key without decrypting others; simpler partial updates.                                         |
| Workspace↔Settings cardinality | `OneToOneField(Workspace)` with `get_or_create` in the API                                                                                       | Nullable FK on Workspace itself                                    | Keeps `accounts.Workspace` clean; `get_or_create` handles the first-access case without a migration dependency.                         |
| Ollama integration             | `OllamaProvider` uses Ollama's OpenAI-compatible `/v1/chat/completions` endpoint (same httpx SSE pattern as `OpenAIProvider`)                    | Call `/api/generate` (Ollama-native); use a third-party Ollama SDK | OpenAI-compat endpoint means zero new HTTP client code — mirrors existing `_live_stream` in `openai_provider.py`.                       |
| Provider instantiation         | `get_provider(key, workspace=None)` — registry receives workspace, resolves keys internally                                                      | Callers resolve keys and pass them in                              | Keeps callers (chat_service, services) simple; single resolution point.                                                                 |
| Model selection persistence    | `preferred_models` JSONField on `WorkspaceAISettings` (`{"openai": "gpt-4o-mini", "ollama": "llama3"}`)                                          | Separate `PreferredModel` table                                    | JSON is simpler for a small fixed set of providers; no joins needed.                                                                    |

## Data Flow

```
Frontend PUT /ai-settings ──→ Owner auth check ──→ AIKeyVault.encrypt(key) ──→ DB
                                                                                │
Chat request POST /chat/stream                                                  │
  │                                                                             │
  ├─→ get_provider("openai", workspace) ─→ WorkspaceAISettings.get_or_create ──┘
  │       │
  │       ├── has DB key? → AIKeyVault.decrypt() → use it
  │       └── no DB key?  → os.environ fallback
  │
  └─→ provider.generate_stream(prompt, context) ──→ SSE events to client
```

Ollama model listing:

```
GET /generation/ollama/models
  └─→ WorkspaceAISettings.ollama_base_url
        └─→ httpx.get("{base_url}/api/tags") → return model names
```

## File Changes

| File                                                                | Action | Description                                                                                               |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `backend/apps/workspace/models.py`                                  | Create | `WorkspaceAISettings` model with encrypted key columns, `ollama_base_url`, `preferred_models` JSON        |
| `backend/apps/workspace/crypto.py`                                  | Create | `AIKeyVault` — `encrypt(str) → str`, `decrypt(str) → str` using Fernet with `b"socialclaw-ai-keys"` salt  |
| `backend/apps/workspace/api.py`                                     | Create | `GET/PUT /api/v1/workspace/ai-settings` (Owner-only); `GET /api/v1/generation/ollama/models`              |
| `backend/apps/workspace/migrations/0002_workspaceaisettings.py`     | Create | Django migration for the new model                                                                        |
| `backend/apps/generation/providers/base.py`                         | Modify | Add optional `api_key` and `api_base` params to `BaseProvider.__init__`                                   |
| `backend/apps/generation/providers/openai_provider.py`              | Modify | Accept `api_key` kwarg; fallback to `os.environ` in `__init__`                                            |
| `backend/apps/generation/providers/anthropic_provider.py`           | Modify | Same pattern as openai                                                                                    |
| `backend/apps/generation/providers/gemini_provider.py`              | Modify | Same pattern as openai                                                                                    |
| `backend/apps/generation/providers/openrouter_provider.py`          | Modify | Same pattern as openai                                                                                    |
| `backend/apps/generation/providers/ollama_provider.py`              | Create | `OllamaProvider(BaseProvider)` — uses `{base_url}/v1/chat/completions` via httpx SSE                      |
| `backend/apps/generation/providers/registry.py`                     | Modify | `get_provider(key, workspace=None)` — resolves keys from `WorkspaceAISettings`, passes to constructor     |
| `backend/apps/generation/chat_service.py`                           | Modify | Pass `workspace` to `get_provider()`                                                                      |
| `backend/apps/generation/chat_api.py`                               | Modify | Add optional `model_id` to `ChatStreamIn`; resolve workspace from membership                              |
| `backend/config/settings/base.py`                                   | Modify | Add `AI_ENCRYPTION_KEY` setting (optional, falls back to `SOCIAL_TOKEN_ENCRYPTION_KEY` then `SECRET_KEY`) |
| `frontend/src/features/settings/ai-providers/ai-providers-page.tsx` | Create | BYOK settings form (key inputs per provider, Ollama URL)                                                  |
| `frontend/src/features/settings/ai-providers/api.ts`                | Create | `fetchAISettings()`, `updateAISettings()`                                                                 |
| `frontend/src/features/canvas/header-dropdowns.tsx`                 | Modify | Add model sub-picker under each provider in `ProviderDropdown`                                            |
| `frontend/src/app/router.tsx`                                       | Modify | Add `/settings/ai-providers` route                                                                        |

## Interfaces / Contracts

```python
# backend/apps/workspace/models.py
class WorkspaceAISettings(models.Model):
    workspace = models.OneToOneField("accounts.Workspace", on_delete=models.CASCADE, related_name="ai_settings")
    openai_api_key_enc = models.TextField(blank=True, default="")
    anthropic_api_key_enc = models.TextField(blank=True, default="")
    gemini_api_key_enc = models.TextField(blank=True, default="")
    openrouter_api_key_enc = models.TextField(blank=True, default="")
    ollama_base_url = models.URLField(blank=True, default="http://localhost:11434")
    preferred_models = models.JSONField(default=dict, blank=True)  # {"openai": "gpt-4o-mini", ...}
    updated_at = models.DateTimeField(auto_now=True)
```

```python
# PUT /api/v1/workspace/ai-settings — request body
class AISettingsIn(Schema):
    openai_api_key: str | None = None      # plaintext; encrypted server-side
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    ollama_base_url: str | None = None
    preferred_models: dict[str, str] | None = None

# GET /api/v1/workspace/ai-settings — response
class AISettingsOut(Schema):
    has_openai_key: bool          # never expose actual keys
    has_anthropic_key: bool
    has_gemini_key: bool
    has_openrouter_key: bool
    ollama_base_url: str
    preferred_models: dict[str, str]
```

```python
# Updated registry signature
def get_provider(key: str, workspace: "Workspace | None" = None) -> BaseProvider:
    ...
```

```python
# Updated ChatStreamIn
class ChatStreamIn(Schema):
    messages: list[dict]
    provider: str = "openai"
    model_id: str | None = None      # NEW — optional model override
    project_id: int | None = None
    format: str = "ig_square"
    network: str = ""
    conversation_id: int | None = None
```

## Testing Strategy

| Layer       | What to Test                                                                         | Approach                                           |
| ----------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Unit        | `AIKeyVault.encrypt/decrypt` roundtrip; different salts produce different ciphertext | Mirror `tests/integrations/test_crypto.py` pattern |
| Unit        | `get_provider()` with workspace key vs env fallback                                  | Mock `WorkspaceAISettings.objects.get_or_create`   |
| Unit        | `OllamaProvider` mock generation + stream                                            | Same mock pattern as existing providers            |
| Integration | `PUT/GET /ai-settings` Owner-only enforcement                                        | Django test client; verify 403 for non-owners      |
| Integration | `GET /ollama/models` proxies to Ollama                                               | Mock httpx response                                |
| Integration | Chat stream uses workspace key over env                                              | Set both, verify provider receives DB key          |

## Migration / Rollout

- **Phase 1 migration**: `0002_workspaceaisettings.py` — adds the table. Reversible via `migrate workspace 0001`.
- **Encryption key**: `AI_ENCRYPTION_KEY` env var must be set before production deploy. Falls back to `SOCIAL_TOKEN_ENCRYPTION_KEY` → `SECRET_KEY` in dev.
- **Ollama** (Phase 2): No migration — uses `ollama_base_url` column from Phase 1 migration.
- **Model selection** (Phase 3): No migration — uses `preferred_models` JSON column from Phase 1 migration.
- All three phases ship behind the same migration; features activate progressively via frontend route availability.

## Open Questions

- [ ] Should `AI_ENCRYPTION_KEY` be a separate env var or reuse `SOCIAL_TOKEN_ENCRYPTION_KEY`? (Design assumes separate for isolation, fallback to shared.)
- [ ] Rate-limit on `/ai-settings` PUT to prevent abuse? (Low priority — Owner-only.)
