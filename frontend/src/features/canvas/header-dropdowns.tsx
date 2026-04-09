import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  Check,
  ExternalLink,
  FolderOpen,
  Cpu,
  KeyRound,
  Search,
} from "lucide-react";
import { useMemo, useState, useEffect, type ReactNode } from "react";
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
import { saveAISettings } from "../settings/ai-providers/api";
import { useCanvasStore } from "./canvas-store";
import type { NetworkId } from "./types";
import { useActiveProvider, ALL_KNOWN_PROVIDERS } from "./use-active-provider";

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
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "pinterest", label: "Pinterest" },
];

const triggerClassName =
  "flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800/70 bg-zinc-950/80 px-3 text-sm text-zinc-200 transition-colors hover:bg-white/[0.04] hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50";

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
        <button className={triggerClassName}>
          <FolderOpen size={13} className="text-zinc-500" />
          <span className="max-w-[120px] truncate">
            {selected ? selected.name : "No project"}
          </span>
          <ChevronDown size={12} className="text-zinc-500" />
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
          <FolderOpen size={13} className="text-zinc-500" />
          <span className="flex-1">No project</span>
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
              style={{ backgroundColor: p.color ?? "#6366f1" }}
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
        <button className={triggerClassName}>
          <span>{selected ? selected.label : "Social network"}</span>
          <ChevronDown size={12} className="text-zinc-500" />
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
        <button disabled={!network} className={triggerClassName}>
          <span>{selected ? selected.label : "Format"}</span>
          <ChevronDown size={12} className="text-zinc-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[200px] max-h-64 overflow-y-auto">
        {networkFormats.length === 0 && (
          <div className="px-2 py-2 text-sm text-zinc-500">
            Select a network first
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
            <span className="text-xs text-zinc-500">
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

  let providerLabel = "Providers";
  if (selectedProviders.length > 0) {
    const providerUnit =
      selectedProviders.length > 1 ? "providers" : "provider";
    providerLabel = `${selectedProviders.length} ${providerUnit}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={triggerClassName}>
          <span>{providerLabel}</span>
          <ChevronDown size={12} className="text-zinc-500" />
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
                <span className="text-xs text-zinc-500">
                  {ollamaModels.length}{" "}
                  {ollamaModels.length === 1 ? "model" : "models"}
                </span>
              )}
              {isOllama && ollamaModels.length === 0 && (
                <span className="text-xs text-zinc-600">offline</span>
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
    "openai/gpt-4o-mini",
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
    "openai/o1",
    "openai/o1-mini",
    "openai/o3-mini",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3.5-haiku",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "anthropic/claude-3-haiku",
    "google/gemini-2.5-flash-preview",
    "google/gemini-2.0-flash-001",
    "google/gemini-pro-1.5",
    "google/gemini-flash-1.5",
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-3.1-405b-instruct",
    "meta-llama/llama-3.1-70b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-large-2411",
    "mistralai/mistral-medium",
    "mistralai/mistral-small-3.1-24b-instruct",
    "mistralai/codestral-2501",
    "deepseek/deepseek-chat-v3-0324",
    "deepseek/deepseek-r1",
    "qwen/qwen-2.5-72b-instruct",
    "qwen/qwen-2.5-coder-32b-instruct",
    "cohere/command-r-plus",
    "cohere/command-r",
    "perplexity/sonar-pro",
    "perplexity/sonar",
    "x-ai/grok-2-1212",
    "microsoft/phi-4",
    "nvidia/llama-3.1-nemotron-70b-instruct",
  ],
};

// ---- Provider icon helpers ----

function providerIcon(provider: string, size = 16) {
  const sizeClass = size === 16 ? "h-4 w-4" : "h-5 w-5";
  const iconClass = cn(
    "inline-flex items-center justify-center rounded-md text-[10px] font-bold",
    sizeClass,
  );

  switch (provider) {
    case "openai":
      return (
        <span className={cn(iconClass, "bg-emerald-500/20 text-emerald-400")}>
          AI
        </span>
      );
    case "anthropic":
      return (
        <span className={cn(iconClass, "bg-orange-500/20 text-orange-400")}>
          A
        </span>
      );
    case "gemini":
      return (
        <span className={cn(iconClass, "bg-blue-500/20 text-blue-400")}>G</span>
      );
    case "openrouter":
      return (
        <span className={cn(iconClass, "bg-purple-500/20 text-purple-400")}>
          OR
        </span>
      );
    case "ollama":
      return (
        <span className={cn(iconClass, "bg-zinc-500/20 text-zinc-400")}>
          OL
        </span>
      );
    default:
      return (
        <span className={cn(iconClass, "bg-zinc-500/20 text-zinc-400")}>?</span>
      );
  }
}

const OPENROUTER_ORG_ICON_RULES: ReadonlyArray<{
  matches: (org: string) => boolean;
  icon: () => ReactNode;
}> = [
  {
    matches: (org) => org.includes("openai"),
    icon: () => providerIcon("openai"),
  },
  {
    matches: (org) => org.includes("anthropic"),
    icon: () => providerIcon("anthropic"),
  },
  {
    matches: (org) => org.includes("google"),
    icon: () => providerIcon("gemini"),
  },
  {
    matches: (org) => org.includes("meta") || org.includes("llama"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-blue-600/20 text-[10px] font-bold text-blue-300">
        M
      </span>
    ),
  },
  {
    matches: (org) => org.includes("mistral") || org.includes("mistralai"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-amber-500/20 text-[10px] font-bold text-amber-400">
        Mi
      </span>
    ),
  },
  {
    matches: (org) => org.includes("deepseek"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
        DS
      </span>
    ),
  },
  {
    matches: (org) => org.includes("qwen"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-violet-500/20 text-[10px] font-bold text-violet-400">
        Q
      </span>
    ),
  },
  {
    matches: (org) => org.includes("cohere"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-rose-500/20 text-[10px] font-bold text-rose-400">
        C
      </span>
    ),
  },
  {
    matches: (org) => org.includes("perplexity"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-teal-500/20 text-[10px] font-bold text-teal-400">
        P
      </span>
    ),
  },
  {
    matches: (org) => org.includes("x-ai") || org.includes("grok"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-zinc-300/20 text-[10px] font-bold text-zinc-300">
        X
      </span>
    ),
  },
  {
    matches: (org) => org.includes("microsoft"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-sky-500/20 text-[10px] font-bold text-sky-400">
        MS
      </span>
    ),
  },
  {
    matches: (org) => org.includes("nvidia"),
    icon: () => (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-green-500/20 text-[10px] font-bold text-green-400">
        NV
      </span>
    ),
  },
];

function modelProviderIcon(model: string, activeProvider: string) {
  if (activeProvider !== "openrouter") return null;
  const org = model.split("/")[0]?.toLowerCase() ?? "";
  for (const rule of OPENROUTER_ORG_ICON_RULES) {
    if (rule.matches(org)) return rule.icon();
  }
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-zinc-500/20 text-[10px] font-bold text-zinc-400">
      {org.charAt(0).toUpperCase()}
    </span>
  );
}

// ---- Model Dropdown ----

interface ModelDropdownProps {
  iconOnly?: boolean;
  className?: string;
}

export function ModelDropdown({
  iconOnly = false,
  className,
}: ModelDropdownProps = {}) {
  const selectedProviders = useCanvasStore((s) => s.config.selectedProviders);
  const selectedModels = useCanvasStore((s) => s.config.selectedModels);
  const setConfig = useCanvasStore((s) => s.setConfig);
  const queryClient = useQueryClient();

  const { activeProvider, configuredProviders, aiSettings, ollamaModels } =
    useActiveProvider();

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

  // Sync saved preferred_models into canvas config when they load
  // (Only if user hasn't already made local selections this session)
  const hasHydrated = useCanvasStore(
    (s) => Object.keys(s.config.selectedModels).length > 0,
  );

  useEffect(() => {
    if (aiSettings?.preferred_models && !hasHydrated) {
      const saved = aiSettings.preferred_models;
      if (Object.keys(saved).length > 0) {
        setConfig({ selectedModels: saved });
      }
    }
  }, [aiSettings?.preferred_models, hasHydrated, setConfig]);

  const modelsForProvider = (provider: string): string[] => {
    if (provider === "ollama") {
      return ollamaModels.map((m) => m.name);
    }
    return STATIC_MODELS[provider] ?? [];
  };

  const handleSelectModel = (provider: string, model: string) => {
    const updated = { ...selectedModels, [provider]: model };
    setConfig({
      selectedModels: updated,
      selectedProviders: [
        provider,
        ...selectedProviders.filter((x) => x !== provider),
      ],
    });
    // Persist to workspace preferences
    saveMutation.mutate(updated);
  };

  const currentModel = activeProvider
    ? (selectedModels[activeProvider] ?? "")
    : "";

  const [modelSearch, setModelSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const viewingProvider = selectedProvider ?? activeProvider;

  const models = useMemo(
    () => (viewingProvider ? modelsForProvider(viewingProvider) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modelsForProvider is stable per viewingProvider+ollamaModels
    [viewingProvider, ollamaModels],
  );

  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return models;
    return models.filter((m) => m.toLowerCase().includes(query));
  }, [models, modelSearch]);

  let displayLabel = "Configure AI";
  if (currentModel) {
    displayLabel = currentModel.split("/").pop() ?? currentModel;
  } else if (activeProvider) {
    displayLabel = "Model";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={selectedProviders.length === 0}
          className={cn(
            triggerClassName,
            iconOnly && "w-8 px-0 justify-center",
            className,
          )}
          aria-label={iconOnly ? "Select models" : undefined}
        >
          {iconOnly ? (
            <Bot size={14} className="text-zinc-50" />
          ) : (
            <>
              <Cpu size={13} className="text-zinc-500" />
              <span className="max-w-[160px] truncate">{displayLabel}</span>
              <ChevronDown size={12} className="text-zinc-500" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[320px] max-h-[28rem] flex flex-col overflow-hidden">
        {/* Top bar: provider selector + search */}
        <div className="flex items-center gap-2 border-b border-zinc-800/70 px-3 py-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProviderPicker(!showProviderPicker);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800/70 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-200 transition-colors hover:border-zinc-700 hover:text-zinc-50"
            >
              {viewingProvider ? (
                providerIcon(viewingProvider)
              ) : (
                <Bot size={12} />
              )}
              <span className="max-w-[80px] truncate capitalize">
                {viewingProvider ?? "Provider"}
              </span>
              <ChevronDown size={10} className="text-zinc-500" />
            </button>
            {showProviderPicker && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-800/70 bg-zinc-950 py-1 shadow-xl">
                {ALL_KNOWN_PROVIDERS.map((p) => {
                  const isConfigured = configuredProviders.includes(p);
                  const isActive = p === viewingProvider;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProvider(p);
                        setModelSearch("");
                        setShowProviderPicker(false);
                        if (isConfigured) {
                          setConfig({
                            selectedProviders: [
                              p,
                              ...selectedProviders.filter((x) => x !== p),
                            ],
                          });
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors",
                        isActive
                          ? "bg-white/[0.06] text-zinc-50"
                          : "text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-100",
                      )}
                    >
                      {providerIcon(p)}
                      <span className="flex-1 text-left capitalize">{p}</span>
                      {!isConfigured && (
                        <span className="text-[10px] text-zinc-600">
                          not configured
                        </span>
                      )}
                      {isActive && (
                        <Check size={12} className="text-zinc-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full rounded-md border border-zinc-800/70 bg-zinc-950/80 py-1.5 pl-8 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Not configured message */}
        {viewingProvider && !configuredProviders.includes(viewingProvider) && (
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
              <KeyRound size={16} className="text-amber-400" />
              <span className="capitalize">
                {viewingProvider} — API key not set
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-zinc-400">
              Configure an API key for {viewingProvider} to use these models.
            </p>
            <a
              href="/settings/ai-providers"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-white"
            >
              <span>Go to settings</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* No provider selected at all */}
        {!viewingProvider && (
          <div className="px-4 py-4 text-center text-xs text-zinc-500">
            Select a provider to see available models.
          </div>
        )}

        {/* Model list — only when the viewed provider IS configured */}
        {viewingProvider && configuredProviders.includes(viewingProvider) && (
          <div className="flex-1 overflow-y-auto">
            {models.length === 0 && (
              <div className="px-3 py-3 text-xs text-zinc-500">
                {viewingProvider === "ollama"
                  ? "Ollama offline or no models pulled"
                  : "No models available for this provider"}
              </div>
            )}
            {models.length > 0 && filteredModels.length === 0 && (
              <div className="px-3 py-3 text-xs text-zinc-500">
                No models match &ldquo;{modelSearch.trim()}&rdquo;
              </div>
            )}
            {filteredModels.map((model) => {
              const isSelected =
                viewingProvider !== null &&
                selectedModels[viewingProvider] === model;
              const icon = viewingProvider
                ? modelProviderIcon(model, viewingProvider)
                : null;
              return (
                <DropdownMenuItem
                  key={model}
                  onSelect={() =>
                    viewingProvider && handleSelectModel(viewingProvider, model)
                  }
                  className={cn(
                    "flex items-center gap-2",
                    isSelected && "font-medium",
                  )}
                >
                  {icon}
                  <span className="flex-1 truncate">{model}</span>
                  {isSelected && <Check size={13} />}
                </DropdownMenuItem>
              );
            })}
            {viewingProvider === "openrouter" &&
              modelSearch.trim() &&
              !models.includes(modelSearch.trim()) && (
                <DropdownMenuItem
                  onSelect={() => {
                    handleSelectModel("openrouter", modelSearch.trim());
                    setModelSearch("");
                  }}
                  className="flex items-center gap-2 border-t border-zinc-800/70 text-zinc-300"
                >
                  <span className="flex-1 truncate">
                    Use &ldquo;{modelSearch.trim()}&rdquo; as custom model
                  </span>
                </DropdownMenuItem>
              )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
