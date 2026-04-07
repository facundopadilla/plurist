import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Bot,
  Wifi,
  WifiOff,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../auth/use-auth";
import { fetchAISettings, saveAISettings, testOllamaConnection } from "./api";
import type { AISettingsOut } from "./api";

interface ProviderKeyRowProps {
  label: string;
  hasKey: boolean;
  envVar: string;
  fieldName:
    | "openai_api_key"
    | "anthropic_api_key"
    | "gemini_api_key"
    | "openrouter_api_key";
  onSave: (field: string, value: string) => Promise<void>;
  isSaving: boolean;
}

function StatusPill({ hasKey }: { hasKey: boolean }) {
  return hasKey ? (
    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
      <Check size={10} />
      Configured
    </span>
  ) : (
    <span className="inline-flex items-center rounded-lg border border-zinc-800/70 bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-500">
      Not set
    </span>
  );
}

function ProviderKeyRow({
  label,
  hasKey,
  envVar,
  fieldName,
  onSave,
  isSaving,
}: ProviderKeyRowProps) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave(fieldName, value);
    setValue("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    await onSave(fieldName, "");
  };

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/25 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-100">{label}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Environment variable:{" "}
            <code className="rounded-md bg-zinc-950 px-1.5 py-0.5 text-zinc-300">
              {envVar}
            </code>
          </p>
        </div>
        <StatusPill hasKey={hasKey} />
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              hasKey
                ? "Enter a new key to replace the current one"
                : "Paste API key"
            }
            className="h-11 w-full rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 pr-10 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-2 focus:ring-white/[0.04]"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-100"
            aria-label={visible ? "Hide key" : "Show key"}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || !value.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-50 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <Check size={14} />
            ) : (
              <ArrowRight size={14} />
            )}
            Save
          </button>
          {hasKey && (
            <button
              onClick={() => void handleClear()}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:text-zinc-600"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface OllamaSectionProps {
  currentUrl: string;
  onSave: (url: string) => Promise<void>;
  isSaving: boolean;
}

function OllamaSection({ currentUrl, onSave, isSaving }: OllamaSectionProps) {
  const [url, setUrl] = useState(currentUrl);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleSave = async () => {
    await onSave(url.trim());
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const models = await testOllamaConnection();
      if (models.length > 0) {
        setTestStatus("ok");
        setTestMessage(
          `Connected. ${models.length} model${models.length !== 1 ? "s" : ""} available.`,
        );
      } else {
        setTestStatus("ok");
        setTestMessage("Connected. No models installed yet.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage(
        "Could not reach Ollama. Make sure the server is running at the configured URL.",
      );
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/25 p-5">
      <div>
        <p className="text-sm font-medium text-zinc-100">Ollama</p>
        <p className="mt-1 text-xs text-zinc-500">
          Self-hosted inference endpoint. Leave empty to use{" "}
          <code className="rounded-md bg-zinc-950 px-1.5 py-0.5 text-zinc-300">
            http://localhost:11434
          </code>
          .
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="h-11 flex-1 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-2 focus:ring-white/[0.04]"
        />
        <div className="flex gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || url === currentUrl}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-50 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Save
          </button>
          <button
            onClick={() => void handleTest()}
            disabled={testStatus === "testing"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-600"
          >
            {testStatus === "testing" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wifi size={14} />
            )}
            Test
          </button>
        </div>
      </div>

      {testStatus !== "idle" && testStatus !== "testing" && (
        <div
          className={
            testStatus === "ok"
              ? "mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
              : "mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          }
        >
          {testStatus === "ok" ? <Check size={12} /> : <WifiOff size={12} />}
          {testMessage}
        </div>
      )}
    </div>
  );
}

const PROVIDERS: {
  label: string;
  fieldName: ProviderKeyRowProps["fieldName"];
  hasKeyField: keyof AISettingsOut;
  envVar: string;
}[] = [
  {
    label: "OpenAI",
    fieldName: "openai_api_key",
    hasKeyField: "has_openai_key",
    envVar: "OPENAI_API_KEY",
  },
  {
    label: "Anthropic",
    fieldName: "anthropic_api_key",
    hasKeyField: "has_anthropic_key",
    envVar: "ANTHROPIC_API_KEY",
  },
  {
    label: "Google Gemini",
    fieldName: "gemini_api_key",
    hasKeyField: "has_gemini_key",
    envVar: "GEMINI_API_KEY",
  },
  {
    label: "OpenRouter",
    fieldName: "openrouter_api_key",
    hasKeyField: "has_openrouter_key",
    envVar: "OPENROUTER_API_KEY",
  },
];

export function AIProvidersPage() {
  const { isOwner } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace-ai-settings"],
    queryFn: fetchAISettings,
    enabled: isOwner,
  });

  const [savingField, setSavingField] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: saveAISettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workspace-ai-settings"],
      });
    },
  });

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <KeyRound size={32} className="text-zinc-600" />
        <p className="text-sm text-zinc-400">
          Only workspace owners can manage AI provider settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
        <Loader2 size={14} className="animate-spin" />
        Loading AI settings...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-8 text-sm text-red-300">
        Failed to load AI settings. Please refresh the page.
      </p>
    );
  }

  const handleSaveKey = async (field: string, value: string) => {
    setSavingField(field);
    try {
      await mutation.mutateAsync({ [field]: value });
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveOllamaUrl = async (url: string) => {
    setSavingField("ollama_base_url");
    try {
      await mutation.mutateAsync({ ollama_base_url: url });
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="space-y-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400">
          Workspace settings
        </span>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] text-zinc-50 sm:text-[40px]">
              <Bot size={24} />
              AI Providers
            </h1>
            <p className="mt-3 max-w-3xl text-[16px] leading-7 text-zinc-300">
              Manage API keys, preferred providers, and your local Ollama
              endpoint. Stored keys override server environment variables.
            </p>
          </div>
        </div>
      </section>

      {mutation.isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to save settings."}
        </div>
      )}

      <section className="grid gap-3 xl:grid-cols-2">
        {PROVIDERS.map((p) => (
          <ProviderKeyRow
            key={p.fieldName}
            label={p.label}
            hasKey={data[p.hasKeyField] as boolean}
            envVar={p.envVar}
            fieldName={p.fieldName}
            onSave={handleSaveKey}
            isSaving={savingField === p.fieldName}
          />
        ))}
      </section>

      <OllamaSection
        currentUrl={data.ollama_base_url}
        onSave={handleSaveOllamaUrl}
        isSaving={savingField === "ollama_base_url"}
      />
    </div>
  );
}
