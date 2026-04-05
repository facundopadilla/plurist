import { useQuery } from "@tanstack/react-query";
import { fetchAISettings } from "../settings/ai-providers/api";
import { fetchOllamaModels } from "../generation/api";
import { useCanvasStore } from "./canvas-store";

export const ALL_KNOWN_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "openrouter",
  "ollama",
];

export function useActiveProvider() {
  const selectedProviders = useCanvasStore((s) => s.config.selectedProviders);

  const { data: aiSettings } = useQuery({
    queryKey: ["workspace-ai-settings"],
    queryFn: fetchAISettings,
    staleTime: 60_000,
  });

  const { data: ollamaModels = [] } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: fetchOllamaModels,
    staleTime: 30_000,
    retry: false,
  });

  const configuredProviders = ALL_KNOWN_PROVIDERS.filter((provider) => {
    if (provider === "openai") return aiSettings?.has_openai_key;
    if (provider === "anthropic") return aiSettings?.has_anthropic_key;
    if (provider === "gemini") return aiSettings?.has_gemini_key;
    if (provider === "openrouter") return aiSettings?.has_openrouter_key;
    if (provider === "ollama") {
      return Boolean(aiSettings?.ollama_base_url) || ollamaModels.length > 0;
    }
    return false;
  });

  const activeProvider =
    selectedProviders.find((p) => configuredProviders.includes(p)) ??
    configuredProviders[0] ??
    null;

  return { activeProvider, configuredProviders, aiSettings, ollamaModels };
}
