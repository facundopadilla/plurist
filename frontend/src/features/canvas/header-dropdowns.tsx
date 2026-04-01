import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Check, FolderOpen, Cpu } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { fetchProjects } from "../projects/api";
import {
  fetchFormats,
  fetchProviders,
  fetchOllamaModels,
} from "../generation/api";
import { fetchAISettings, saveAISettings } from "../settings/ai-providers/api";
import { useCanvasStore } from "./canvas-store";
import type { NetworkId } from "./types";

// Providers that are always shown even if the API hasn't loaded yet
const STATIC_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "openrouter",
  "ollama",
];

const NETWORKS: { id: NetworkId; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X / Twitter" },
];

// ---- Project Dropdown ----

export function ProjectDropdown() {
  const projectId = useCanvasStore((s) => s.config.projectId);
  const setConfig = useCanvasStore((s) => s.setConfig);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const selected = projects.find((p) => p.id === projectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <FolderOpen size={13} className="text-muted-foreground" />
          <span className="max-w-[120px] truncate">
            {selected ? selected.name : "Sin proyecto"}
          </span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[180px] max-h-64 overflow-y-auto">
        <DropdownMenuItem
          onSelect={() => setConfig({ projectId: null })}
          className={cn(
            "flex items-center gap-2",
            projectId === null && "font-medium",
          )}
        >
          <FolderOpen size={13} className="text-muted-foreground" />
          <span className="flex-1">Sin proyecto</span>
          {projectId === null && <Check size={13} />}
        </DropdownMenuItem>
        {projects.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => setConfig({ projectId: p.id })}
            className={cn(
              "flex items-center gap-2",
              projectId === p.id && "font-medium",
            )}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color || "#6366f1" }}
            />
            <span className="flex-1 truncate">{p.name}</span>
            {projectId === p.id && <Check size={13} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---- Network Dropdown ----

export function NetworkDropdown() {
  const network = useCanvasStore((s) => s.config.network);
  const setConfig = useCanvasStore((s) => s.setConfig);

  const selected = NETWORKS.find((n) => n.id === network);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span>{selected ? selected.label : "Red social"}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[160px]">
        {NETWORKS.map((n) => (
          <DropdownMenuItem
            key={n.id}
            onSelect={() =>
              setConfig({
                network: n.id,
                formatKey: "",
                formatWidth: 1080,
                formatHeight: 1080,
              })
            }
            className={cn(
              "flex items-center gap-2",
              network === n.id && "font-medium",
            )}
          >
            <span className="flex-1">{n.label}</span>
            {network === n.id && <Check size={13} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---- Format Dropdown ----

export function FormatDropdown() {
  const network = useCanvasStore((s) => s.config.network);
  const formatKey = useCanvasStore((s) => s.config.formatKey);
  const setConfig = useCanvasStore((s) => s.setConfig);

  const { data: formats = [] } = useQuery({
    queryKey: ["formats"],
    queryFn: fetchFormats,
    staleTime: Infinity,
  });

  const networkFormats = formats.filter((f) => f.network === network);
  const selected = formats.find((f) => f.key === formatKey);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={!network}
          className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{selected ? selected.label : "Formato"}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px] max-h-64 overflow-y-auto">
        {networkFormats.length === 0 && (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            Seleccioná una red primero
          </div>
        )}
        {networkFormats.map((fmt) => (
          <DropdownMenuItem
            key={fmt.key}
            onSelect={() =>
              setConfig({
                formatKey: fmt.key,
                formatWidth: fmt.width,
                formatHeight: fmt.height,
              })
            }
            className={cn(
              "flex items-center gap-2",
              formatKey === fmt.key && "font-medium",
            )}
          >
            <span className="flex-1">{fmt.label}</span>
            <span className="text-xs text-muted-foreground">
              {fmt.width}×{fmt.height}
            </span>
            {formatKey === fmt.key && <Check size={13} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---- Provider Dropdown (multi-select) ----

export function ProviderDropdown() {
  const selectedProviders = useCanvasStore((s) => s.config.selectedProviders);
  const setConfig = useCanvasStore((s) => s.setConfig);

  const { data: providers = STATIC_PROVIDERS } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  // Pre-fetch Ollama models so they're ready when Ollama is selected
  const { data: ollamaModels = [] } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: fetchOllamaModels,
    staleTime: 30_000,
    retry: false,
  });

  const toggle = (key: string) => {
    const next = selectedProviders.includes(key)
      ? selectedProviders.filter((p) => p !== key)
      : [...selectedProviders, key];
    setConfig({ selectedProviders: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span>
            {selectedProviders.length === 0
              ? "Proveedores"
              : `${selectedProviders.length} proveedor${selectedProviders.length > 1 ? "es" : ""}`}
          </span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px]">
        {providers.map((key) => {
          const isSelected = selectedProviders.includes(key);
          const isOllama = key === "ollama";
          return (
            <DropdownMenuCheckboxItem
              key={key}
              checked={isSelected}
              onCheckedChange={() => toggle(key)}
            >
              <span className="flex-1">{key}</span>
              {isOllama && ollamaModels.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {ollamaModels.length} model
                  {ollamaModels.length !== 1 ? "s" : ""}
                </span>
              )}
              {isOllama && ollamaModels.length === 0 && (
                <span className="text-xs text-muted-foreground/60">
                  offline
                </span>
              )}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---- Static model lists per provider ----

const STATIC_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ],
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-pro-exp-02-05",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  openrouter: [
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet",
    "google/gemini-pro-1.5",
    "meta-llama/llama-3.1-70b-instruct",
  ],
};

// ---- Model Dropdown ----

export function ModelDropdown() {
  const selectedProviders = useCanvasStore((s) => s.config.selectedProviders);
  const selectedModels = useCanvasStore((s) => s.config.selectedModels);
  const setConfig = useCanvasStore((s) => s.setConfig);
  const queryClient = useQueryClient();

  // Fetch Ollama models for dynamic list
  const { data: ollamaModels = [] } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: fetchOllamaModels,
    staleTime: 30_000,
    retry: false,
  });

  // Save preferred model mutation
  const saveMutation = useMutation({
    mutationFn: (models: Record<string, string>) =>
      saveAISettings({ preferred_models: models }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workspace-ai-settings"],
      });
    },
  });

  // Rehydrate selectedModels from saved preferences on mount
  const { data: aiSettings } = useQuery({
    queryKey: ["workspace-ai-settings"],
    queryFn: fetchAISettings,
    staleTime: 60_000,
  });

  // Sync saved preferred_models into canvas config when they load
  // (Only if user hasn't already made local selections this session)
  const hasHydrated = useCanvasStore(
    (s) => Object.keys(s.config.selectedModels).length > 0,
  );

  if (aiSettings?.preferred_models && !hasHydrated) {
    const saved = aiSettings.preferred_models;
    if (Object.keys(saved).length > 0) {
      setConfig({ selectedModels: saved });
    }
  }

  const activeProvider = selectedProviders[0] ?? "openai";

  const modelsForProvider = (provider: string): string[] => {
    if (provider === "ollama") {
      return ollamaModels.map((m) => m.name);
    }
    return STATIC_MODELS[provider] ?? [];
  };

  const handleSelectModel = (provider: string, model: string) => {
    const updated = { ...selectedModels, [provider]: model };
    setConfig({ selectedModels: updated });
    // Persist to workspace preferences
    saveMutation.mutate(updated);
  };

  const currentModel = selectedModels[activeProvider] ?? "";

  const models = modelsForProvider(activeProvider);

  const displayLabel = currentModel
    ? (currentModel.split("/").pop() ?? currentModel)
    : "Modelo";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={selectedProviders.length === 0}
          className="flex items-center gap-1.5 h-8 px-3 text-sm rounded-md border border-border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Cpu size={13} className="text-muted-foreground" />
          <span className="max-w-[160px] truncate">{displayLabel}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[220px] max-h-72 overflow-y-auto">
        {selectedProviders.length > 1 && (
          <div className="px-2 pt-1 pb-0.5">
            {selectedProviders.map((p) => (
              <button
                key={p}
                onClick={() =>
                  setConfig({
                    selectedProviders: [
                      p,
                      ...selectedProviders.filter((x) => x !== p),
                    ],
                  })
                }
                className={cn(
                  "inline-flex items-center px-2 py-0.5 mr-1 mb-1 text-xs rounded-full border transition-colors",
                  p === activeProvider
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {p}
              </button>
            ))}
            <div className="border-b border-border mt-1 mb-1" />
          </div>
        )}
        {models.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            {activeProvider === "ollama"
              ? "Ollama offline o sin modelos"
              : "Sin modelos disponibles"}
          </div>
        )}
        {models.map((model) => {
          const isSelected = selectedModels[activeProvider] === model;
          return (
            <DropdownMenuItem
              key={model}
              onSelect={() => handleSelectModel(activeProvider, model)}
              className={cn(
                "flex items-center gap-2",
                isSelected && "font-medium",
              )}
            >
              <span className="flex-1 truncate">{model}</span>
              {isSelected && <Check size={13} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
