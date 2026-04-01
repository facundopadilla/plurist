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
} from "lucide-react";
import { useAuth } from "../../auth/use-auth";
import { fetchAISettings, saveAISettings, testOllamaConnection } from "./api";
import type { AISettingsOut } from "./api";

// ---------------------------------------------------------------------------
// ProviderKeyRow — single provider row with masked input + save/clear
// ---------------------------------------------------------------------------

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
    <div className="flex flex-col gap-2 py-4 border-b border-border last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Env var:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {envVar}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {hasKey ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              <Check size={10} />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">
              Not set
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              hasKey ? "Enter new key to replace…" : "Enter API key…"
            }
            className="elegant-input w-full pr-9 font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={visible ? "Hide key" : "Show key"}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || !value.trim()}
          className="elegant-button-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} />
          ) : (
            "Save"
          )}
        </button>
        {hasKey && (
          <button
            onClick={() => void handleClear()}
            disabled={isSaving}
            className="inline-flex items-center gap-1 rounded-[10px] border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-800 disabled:opacity-50"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OllamaSection — URL input for Ollama base URL
// ---------------------------------------------------------------------------

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
          `Connected — ${models.length} model${models.length !== 1 ? "s" : ""} available`,
        );
      } else {
        setTestStatus("ok");
        setTestMessage("Connected — no models installed yet");
      }
    } catch {
      setTestStatus("error");
      setTestMessage(
        "Could not reach Ollama server. Make sure it's running at the configured URL.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-4">
      <div>
        <p className="text-sm font-medium text-foreground">Ollama Base URL</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Self-hosted Ollama instance. Leave empty to use the default{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            http://localhost:11434
          </code>
          .
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="elegant-input flex-1 font-mono text-sm"
        />
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || url === currentUrl}
          className="elegant-button-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
        </button>
        <button
          onClick={() => void handleTest()}
          disabled={testStatus === "testing"}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {testStatus === "testing" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Wifi size={13} />
          )}
          Test
        </button>
      </div>
      {testStatus !== "idle" && testStatus !== "testing" && (
        <div
          className={`flex items-center gap-1.5 text-xs rounded-md px-3 py-2 ${
            testStatus === "ok"
              ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}
        >
          {testStatus === "ok" ? <Check size={12} /> : <WifiOff size={12} />}
          {testMessage}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

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
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <KeyRound size={32} className="text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">
          Only workspace owners can manage AI provider settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 size={14} className="animate-spin" />
        Loading AI settings…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-red-500 py-8">
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
    <div className="space-y-6 max-w-2xl">
      <div className="paper-page-header">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bot size={20} />
          AI Providers
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure BYOK (Bring Your Own Key) API keys for AI providers. Keys
          are encrypted at rest and take precedence over server environment
          variables.
        </p>
      </div>

      {mutation.isError && (
        <div className="rounded-[14px] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to save settings."}
        </div>
      )}

      <div className="elegant-card px-5 py-1">
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
      </div>

      <div className="elegant-card px-5 py-2">
        <OllamaSection
          currentUrl={data.ollama_base_url}
          onSave={handleSaveOllamaUrl}
          isSaving={savingField === "ollama_base_url"}
        />
      </div>
    </div>
  );
}
