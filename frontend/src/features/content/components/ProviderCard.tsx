import { cn } from "../../../lib/utils";

// Import provider SVG logos as URLs
import claudeLogoUrl from "../../../assets/providers/claude.svg";
import openaiLogoUrl from "../../../assets/providers/openai.svg";
import geminiLogoUrl from "../../../assets/providers/gemini.svg";
import openrouterLogoUrl from "../../../assets/providers/openrouter.svg";

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: claudeLogoUrl,
  claude: claudeLogoUrl,
  openai: openaiLogoUrl,
  google: geminiLogoUrl,
  gemini: geminiLogoUrl,
  openrouter: openrouterLogoUrl,
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Claude",
  claude: "Claude",
  openai: "GPT-4",
  google: "Gemini",
  gemini: "Gemini",
  openrouter: "OpenRouter",
};

interface ProviderCardProps {
  providerKey: string;
  name: string;
  selected: boolean;
  onToggle: () => void;
}

export function ProviderCard({
  providerKey,
  name,
  selected,
  onToggle,
}: ProviderCardProps) {
  const logo = PROVIDER_LOGOS[providerKey.toLowerCase()];
  const label = PROVIDER_LABELS[providerKey.toLowerCase()] ?? name;

  return (
    <button
      onClick={onToggle}
      data-testid={`compare-provider-${providerKey}`}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors min-w-[110px]",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border hover:bg-accent",
      )}
    >
      {logo ? (
        <img
          src={logo}
          alt={label}
          className={cn(
            "h-5 w-5 rounded-sm flex-shrink-0",
            selected && "invert",
          )}
        />
      ) : (
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-xs font-bold flex-shrink-0",
            selected
              ? "bg-background/20 text-background"
              : "bg-muted text-muted-foreground",
          )}
        >
          {label.charAt(0)}
        </span>
      )}
      <span className="font-medium">{label}</span>
    </button>
  );
}
