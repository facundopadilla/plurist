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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
            <Badge variant="success" className="rounded-full px-2 py-0.5 gap-1">
              <Check size={10} />
              Configured
            </Badge>
          ) : (
            <Badge variant="neutral" className="rounded-full px-2 py-0.5">
              Not set
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              hasKey ? "Enter new key to replace…" : "Enter API key…"
            }
            className="w-full pr-9 font-mono text-sm"
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
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !value.trim()}
          size="sm"
          className="px-3 py-1.5 text-xs"
        >
          {isSaving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} />
          ) : (
            "Save"
          )}
        </Button>
        {hasKey && (
          <Button
            onClick={() => void handleClear()}
            disabled={isSaving}
            variant="outline"
            size="sm"
            className="gap-1 text-muted-foreground hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-800"
          >
            <X size={12} />
            Clear
          </Button>
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
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="flex-1 font-mono text-sm"
        />
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || url === currentUrl}
          size="sm"
          className="px-3 py-1.5 text-xs"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
        </Button>
        <Button
          onClick={() => void handleTest()}
          disabled={testStatus === "testing"}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {testStatus === "testing" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Wifi size={13} />
          )}
          Test
        </Button>
      </div>
      {testStatus !== "idle" && testStatus !== "testing" && (
        <Alert
          variant={testStatus === "ok" ? "success" : "destructive"}
          className="py-2"
        >
          <AlertDescription className="flex items-center gap-1.5 text-xs">
            {testStatus === "ok" ? <Check size={12} /> : <WifiOff size={12} />}
            {testMessage}
          </AlertDescription>
        </Alert>
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
      <p className="text-sm text-destructive py-8">
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
        <Alert variant="destructive">
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to save settings."}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm px-5 py-1">
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

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm px-5 py-2">
        <OllamaSection
          currentUrl={data.ollama_base_url}
          onSave={handleSaveOllamaUrl}
          isSaving={savingField === "ollama_base_url"}
        />
      </div>
    </div>
  );
}
