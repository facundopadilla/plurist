# Tasks: Multi-Provider LLM Integration

## Phase 1: Workspace AI Settings & BYOK

- [x] 1.1 Backend: Create `backend/apps/workspace/models.py`, `crypto.py`, and migration `0001_initial.py` for encrypted provider keys, `ollama_base_url`, and `preferred_models`.
- [x] 1.2 Backend: Update `backend/config/settings/base.py` to expose `AI_ENCRYPTION_KEY` fallback rules and wire `AIKeyVault` to the existing Fernet/PBKDF2 pattern.
- [x] 1.3 Backend: Add Owner-only `GET/PUT /api/v1/workspace/ai-settings` in `backend/apps/workspace/api.py`; return `has_*_key` flags only and reject non-owners with 403.
- [x] 1.4 Backend: Refactor `backend/apps/generation/providers/base.py`, `registry.py`, `chat_service.py`, and the four existing provider files to resolve workspace keys first, then `os.environ`.
- [x] 1.5 Frontend: Create `frontend/src/features/settings/ai-providers/api.ts` and `ai-providers-page.tsx` with masked key state, save/clear actions, and Ollama URL input.
- [x] 1.6 Frontend: Register `/settings/ai-providers` in `frontend/src/app/router.tsx` and add navigation entry from existing settings surfaces.

## Phase 2: Ollama Provider Integration

- [x] 2.1 Backend: Create `backend/apps/generation/providers/ollama_provider.py` using the OpenAI-compatible `/v1/chat/completions` stream flow and configurable `api_base`.
- [x] 2.2 Backend: Extend `backend/apps/generation/providers/registry.py` and `backend/apps/generation/chat_service.py` so `get_provider("ollama", workspace)` injects `ollama_base_url` with default `http://localhost:11434`.
- [x] 2.3 Backend: Add `GET /api/v1/generation/ollama/models` in `backend/apps/generation/api.py` to proxy `{base_url}/api/tags` and normalize model names for the client.
- [x] 2.4 Frontend: Extend `frontend/src/features/settings/ai-providers/api.ts` and `ai-providers-page.tsx` to validate/test the Ollama URL and surface unreachable-server errors.
- [x] 2.5 Frontend: Update `frontend/src/features/generation/api.ts` and `frontend/src/features/canvas/header-dropdowns.tsx` so Ollama appears in provider lists and loads remote models on demand.

## Phase 3: Provider Model Selection & End-to-End Verification

- [x] 3.1 Backend: Add optional `model_id` to `backend/apps/generation/chat_api.py` and pass it through `chat_service.py` into provider constructors/calls.
- [x] 3.2 Backend: Update all provider files plus `base.py` so request-level `model_id` overrides hardcoded defaults while workspace `preferred_models` remains the fallback.
- [x] 3.3 Backend: Persist preferred model changes through `backend/apps/workspace/api.py` and apply them when chat requests omit `model_id`.
- [x] 3.4 Frontend: Extend `frontend/src/features/canvas/canvas-store.ts`, `chat/use-chat-stream.ts`, and `header-dropdowns.tsx` with per-provider model selection and request payload wiring.
- [x] 3.5 Frontend: Sync canvas model choices with `frontend/src/features/settings/ai-providers/api.ts` so saved preferences rehydrate the dropdown state.
- [x] 3.6 Verification: Add backend tests for vault roundtrip, owner-only settings, workspace-key-over-env fallback, Ollama model proxy, and `model_id` override; add frontend tests for settings form, Ollama error handling, and provider/model picker behavior.
