import { apiRequest } from "../../../lib/api/client";
import type { OllamaModel } from "../../generation/types";

export interface AISettingsOut {
  has_openai_key: boolean;
  has_anthropic_key: boolean;
  has_gemini_key: boolean;
  has_openrouter_key: boolean;
  ollama_base_url: string;
  preferred_models: Record<string, string>;
}

export interface AISettingsIn {
  openai_api_key?: string | null;
  anthropic_api_key?: string | null;
  gemini_api_key?: string | null;
  openrouter_api_key?: string | null;
  ollama_base_url?: string | null;
  preferred_models?: Record<string, string> | null;
}

export function fetchAISettings(): Promise<AISettingsOut> {
  return apiRequest<AISettingsOut>("/api/v1/workspace/ai-settings");
}

export function saveAISettings(data: AISettingsIn): Promise<AISettingsOut> {
  return apiRequest<AISettingsOut>("/api/v1/workspace/ai-settings", {
    method: "PUT",
    body: data,
  });
}

/** Probe the Ollama server by hitting the models proxy endpoint. */
export function testOllamaConnection(): Promise<OllamaModel[]> {
  return apiRequest<OllamaModel[]>("/api/v1/generation/ollama/models");
}

export type { OllamaModel };
