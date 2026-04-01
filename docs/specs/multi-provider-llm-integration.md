# Multi-Provider LLM Integration Specification

## Purpose

Enables per-workspace API key management (encrypted), Ollama as a local-model provider, and user-selectable models per provider, overriding server-side `.env` variables.

## Requirements

### Phase 1: Workspace AI Settings & Bring Your Own Key (BYOK)

### Requirement: Encrypted API Key Storage

The system MUST securely store API keys per workspace using Fernet encryption in the `WorkspaceAISettings` model.

#### Scenario: Owner saves a new API key

- GIVEN a user with the Owner role in a workspace
- WHEN they submit a new OpenAI API key via the settings UI
- THEN the system encrypts the key using Fernet
- AND saves it to the workspace's `WorkspaceAISettings` record
- AND returns a success response without exposing the raw key.

#### Scenario: Non-owner attempts to save API key

- GIVEN a user with a non-Owner role
- WHEN they attempt to update `WorkspaceAISettings` via the API
- THEN the system rejects the request with a 403 Forbidden error.

### Requirement: Provider Authentication Fallback

The system MUST prioritize workspace-level API keys over environment variables for all AI providers.

#### Scenario: Workspace has a custom key

- GIVEN a workspace with an encrypted OpenAI API key stored
- WHEN a generation request is made
- THEN the system uses the workspace's decrypted key for authentication.

#### Scenario: Workspace has no custom key

- GIVEN a workspace without a custom OpenAI API key
- WHEN a generation request is made
- THEN the system falls back to the `os.environ` API key.

### Phase 2: Ollama Provider Integration

### Requirement: Ollama Configuration

The system MUST allow configuring an `ollama_base_url` per workspace (defaulting to `http://localhost:11434`) and exposing an Ollama provider.

#### Scenario: System retrieves Ollama models

- GIVEN a valid `ollama_base_url` configured in `WorkspaceAISettings`
- WHEN the client requests available Ollama models via `GET /api/v1/generation/ollama/models`
- THEN the system proxies the request to the configured Ollama `/api/tags` endpoint
- AND returns a list of available models.

#### Scenario: User generates chat with Ollama

- GIVEN an Ollama model is selected
- WHEN a streaming chat generation request is initiated
- THEN the system uses the `OllamaProvider` pointing to the configured base URL
- AND streams the response back to the client using Ollama's OpenAI-compatible `/v1/` endpoint.

### Phase 3: Model Selection UI

### Requirement: Custom Model Selection

The system MUST allow users to select specific models per provider and persist these preferences.

#### Scenario: User changes preferred model for a provider

- GIVEN the user is on the canvas
- WHEN they select a different model from the `ProviderDropdown`
- THEN the system updates the `preferred_models` JSON field in `WorkspaceAISettings`
- AND subsequent generation requests for that provider include the selected `model_id`.

#### Scenario: Provider processes generation with custom model

- GIVEN a generation request contains an optional `model_id`
- WHEN the provider prepares the API payload
- THEN the provider MUST use the provided `model_id` instead of its hardcoded default.
