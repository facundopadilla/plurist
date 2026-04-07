# Proposal: Multi-Provider LLM Integration (BYOK + Ollama + Model Selection)

## Intent

Plurist's AI providers read API keys exclusively from server-side `.env` variables. This blocks workspace owners from bringing their own keys, prevents local model usage via Ollama, and forces hardcoded model choices. This change enables per-workspace API key management (encrypted), Ollama as a local-model provider, and user-selectable models per provider.

## Scope

### In Scope

- `WorkspaceAISettings` DB model (one-to-one with Workspace) storing encrypted API keys via Fernet
- Fallback chain: workspace settings → `os.environ` for all existing providers
- REST endpoints `GET/PUT /api/v1/workspace/ai-settings` (Owner role only)
- `OllamaProvider` using Ollama's OpenAI-compatible API (`/v1/`)
- `GET /api/v1/generation/ollama/models` to list available Ollama models
- Frontend settings page `/settings/ai-providers` for key and Ollama URL configuration
- Per-provider model selection in the canvas `ProviderDropdown`
- `WorkspaceAISettings.preferred_model` JSON field for storing model choices per provider

### Out of Scope

- Executing local CLI tools (`codex`, `claude`, `gemini CLI`) from the web server process
- Per-user (non-workspace) API key scoping
- Support for providers beyond OpenAI, Anthropic, Gemini, OpenRouter, Ollama
- Replacing existing provider architecture with `any-llm` abstraction layer
- Ollama authentication / remote Ollama tunneling setup

## Approach

Three sequential phases, each shippable independently:

**Phase 1 — WorkspaceAISettings + BYOK**
Add `WorkspaceAISettings` (one-to-one Workspace) with Fernet-encrypted key columns (`openai_api_key_enc`, `anthropic_api_key_enc`, `gemini_api_key_enc`, `openrouter_api_key_enc`). Migrate all providers to use a `get_api_key(workspace)` helper that checks DB first, falls back to `os.environ`. Add Owner-only settings API + frontend form.

**Phase 2 — Ollama Provider**
Add `OllamaProvider` to the registry. Reads `ollama_base_url` from `WorkspaceAISettings` (default `http://localhost:11434`). Lists models via `GET /api/tags`. Uses Ollama's OpenAI-compatible `/v1/` endpoint — no net-new HTTP client needed.

**Phase 3 — Model Selection UI**
Add `preferred_models` JSON field to `WorkspaceAISettings`. Extend `ProviderDropdown` to render a model picker per provider. Backend accepts optional `model_id` in chat payload; providers use it over their hardcoded default.

## Affected Areas

| Area                                                       | Impact   | Description                                     |
| ---------------------------------------------------------- | -------- | ----------------------------------------------- |
| `backend/apps/workspace/models.py`                         | New      | `WorkspaceAISettings` model                     |
| `backend/apps/generation/providers/base.py`                | Modified | Accept `api_key`, `api_base`, `model_id` params |
| `backend/apps/generation/providers/openai_provider.py`     | Modified | Read key from workspace                         |
| `backend/apps/generation/providers/anthropic_provider.py`  | Modified | Read key from workspace                         |
| `backend/apps/generation/providers/gemini_provider.py`     | Modified | Read key from workspace                         |
| `backend/apps/generation/providers/openrouter_provider.py` | Modified | Read key from workspace                         |
| `backend/apps/generation/providers/ollama_provider.py`     | New      | Ollama provider                                 |
| `backend/apps/generation/providers/registry.py`            | Modified | Dynamic provider resolution                     |
| `backend/apps/generation/chat_api.py`                      | Modified | Accept optional `model_id`                      |
| `backend/apps/generation/chat_service.py`                  | Modified | Pass workspace settings to provider             |
| `backend/config/settings/base.py`                          | Modified | Add `ENCRYPTION_KEY` setting                    |
| `frontend/src/features/settings/ai-providers/`             | New      | BYOK settings page                              |
| `frontend/src/features/canvas/header-dropdowns.tsx`        | Modified | Model selection per provider                    |
| `frontend/src/app/router.tsx`                              | Modified | Add `/settings/ai-providers` route              |

## Risks

| Risk                                                                      | Likelihood | Mitigation                                                |
| ------------------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `ENCRYPTION_KEY` loss makes all stored keys unrecoverable                 | Low        | Document key rotation procedure; store in secrets manager |
| Ollama unreachable from server (user's Ollama is local, server is remote) | Med        | Clear error message in UI; document network requirements  |
| Provider signature change breaks existing tests                           | Med        | Update mocks in same PR; run test suite before merge      |
| OpenRouter already covers most Ollama use-cases (reduces urgency)         | Low        | No mitigation needed — Ollama is still faster and free    |

## Rollback Plan

- **Phase 1**: Delete `WorkspaceAISettings` table via reverse migration; remove `get_api_key()` helper (providers revert to `os.environ`). No data loss to other models.
- **Phase 2**: Remove `OllamaProvider` from registry. No DB changes needed.
- **Phase 3**: Revert `ProviderDropdown` and chat API — drop `preferred_models` JSON field from settings.

Each phase is independently reversible with a single Django migration rollback.

## Dependencies

- `cryptography` package (Fernet) — already a common Python dep; confirm it's in `pyproject.toml`
- Ollama running at a reachable HTTP endpoint (user responsibility for Phase 2)
- `ENCRYPTION_KEY` env var present before Phase 1 can be enabled in production

## Success Criteria

- [ ] Workspace owner can save and clear API keys from `/settings/ai-providers` without touching `.env`
- [ ] Chat generation works using workspace-stored key (verified with a real OpenAI call)
- [ ] Fallback to `os.environ` still works when no workspace key is set
- [ ] Ollama models appear in `ProviderDropdown` when `ollama_base_url` is configured
- [ ] Streaming chat works end-to-end with a local Ollama model
- [ ] User can select `gpt-4o-mini` vs `gpt-4o` in the canvas and the correct model is used
- [ ] No existing provider tests regress
