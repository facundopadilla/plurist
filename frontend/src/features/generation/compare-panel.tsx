import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { fetchCompareRun, selectVariant } from "./api";
import type { GenerationVariant } from "./types";

interface ComparePanelProps {
  compareRunId: number;
  onVariantSelected?: (variant: GenerationVariant) => void;
}

export function ComparePanel({ compareRunId, onVariantSelected }: ComparePanelProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ["compare-run", compareRunId],
    queryFn: () => fetchCompareRun(compareRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
  });

  const selectMutation = useMutation({
    mutationFn: (variantId: number) => selectVariant(compareRunId, variantId),
    onSuccess: (_data, variantId) => {
      setSelectedId(variantId);
      queryClient.invalidateQueries({ queryKey: ["compare-run", compareRunId] });
      const variant = run?.variants.find((v) => v.id === variantId);
      if (variant && onVariantSelected) onVariantSelected(variant);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="animate-spin" size={16} />
        Loading compare results...
      </div>
    );
  }

  if (!run) return null;

  const isRunning = run.status === "pending" || run.status === "running";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isRunning && <Loader2 className="animate-spin" size={14} />}
        <span>
          Status: <span className="font-medium text-foreground">{run.status}</span>
        </span>
        <span>·</span>
        <span>{run.variants.length} variant(s)</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {run.variants.map((variant) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            isSelected={selectedId === variant.id || variant.is_selected}
            onSelect={() => selectMutation.mutate(variant.id)}
            isSelecting={selectMutation.isPending}
          />
        ))}
      </div>

      {!isRunning && run.variants.length === 0 && (
        <p className="text-muted-foreground text-sm py-4 text-center">
          No variants generated. All providers may have failed.
        </p>
      )}
    </div>
  );
}

function VariantCard({
  variant,
  isSelected,
  onSelect,
  isSelecting,
}: {
  variant: GenerationVariant;
  isSelected: boolean;
  onSelect: () => void;
  isSelecting: boolean;
}) {
  return (
    <div
      data-testid={`compare-provider-${variant.provider}`}
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-colors",
        isSelected
          ? "border-foreground bg-accent"
          : "border-border hover:border-foreground/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} />
          <span className="font-medium text-sm">{variant.provider}</span>
          <span className="text-xs text-muted-foreground">{variant.model_id}</span>
        </div>
        {isSelected && <CheckCircle size={16} className="text-foreground" />}
      </div>

      <p className="text-sm whitespace-pre-wrap">{variant.generated_text}</p>

      <button
        data-testid="select-variant"
        onClick={onSelect}
        disabled={isSelected || isSelecting}
        className={cn(
          "w-full text-sm py-2 px-3 rounded-md font-medium transition-colors",
          isSelected
            ? "bg-foreground text-background cursor-default"
            : "border border-border hover:bg-accent"
        )}
      >
        {isSelected ? "Selected" : "Select variant"}
      </button>
    </div>
  );
}
