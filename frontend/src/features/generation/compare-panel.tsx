import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle,
  Sparkles,
  Code,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { fetchCompareRun, selectVariant } from "./api";
import type { GenerationVariant } from "./types";

interface ComparePanelProps {
  compareRunId: number;
  width?: number;
  height?: number;
  onVariantSelected?: (variant: GenerationVariant, slideIndex: number) => void;
}

export function ComparePanel({
  compareRunId,
  width = 1080,
  height = 1080,
  onVariantSelected,
}: Readonly<ComparePanelProps>) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Record<number, number>>({});
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: run, isLoading } = useQuery({
    queryKey: ["compare-run", compareRunId],
    queryFn: () => fetchCompareRun(compareRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
  });

  const selectMutation = useMutation({
    mutationFn: ({
      variantId,
      slideIdx,
    }: {
      variantId: number;
      slideIdx: number;
    }) => selectVariant(compareRunId, variantId, slideIdx),
    onSuccess: (_data, { variantId, slideIdx }) => {
      setSelectedIds((prev) => ({ ...prev, [slideIdx]: variantId }));
      void queryClient.invalidateQueries({
        queryKey: ["compare-run", compareRunId],
      });
      const variant = run?.variants.find((v) => v.id === variantId);
      if (variant && onVariantSelected) onVariantSelected(variant, slideIdx);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="animate-spin" size={16} />
        Loading results...
      </div>
    );
  }

  if (!run) return null;

  const isRunning = run.status === "pending" || run.status === "running";

  // Group variants by slide index
  const variantsBySlide: Record<number, GenerationVariant[]> = {};
  for (const v of run.variants) {
    const idx = v.slide_index ?? 0;
    if (!variantsBySlide[idx]) variantsBySlide[idx] = [];
    variantsBySlide[idx].push(v);
  }

  // Total slides: from run.slide_count or from actual variants
  const slideIndexes = Object.keys(variantsBySlide)
    .map(Number)
    .sort((a, b) => a - b);
  const totalSlides = Math.max(
    run.slide_count ?? 1,
    slideIndexes.length > 0 ? (slideIndexes.at(-1) ?? 0) + 1 : 1,
  );

  const currentVariants = variantsBySlide[currentSlide] ?? [];
  const runWidth = run.width ?? width;
  const runHeight = run.height ?? height;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isRunning && <Loader2 className="animate-spin" size={14} />}
        <span>
          Status:{" "}
          <span className="font-medium text-foreground">{run.status}</span>
        </span>
        <span>·</span>
        <span>{run.variants.length} variant(s)</span>
        {totalSlides > 1 && (
          <>
            <span>·</span>
            <span>{totalSlides} slides</span>
          </>
        )}
      </div>

      {/* Carousel navigation (only when multi-slide) */}
      {totalSlides > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
            className="p-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium">
            Slide {currentSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={() =>
              setCurrentSlide((s) => Math.min(totalSlides - 1, s + 1))
            }
            disabled={currentSlide >= totalSlides - 1}
            className="p-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Variant cards for current slide */}
      <div className="grid gap-4 md:grid-cols-2">
        {currentVariants.map((variant) => {
          const slideIdx = variant.slide_index ?? 0;
          return (
            <VariantCard
              key={variant.id}
              variant={variant}
              runWidth={runWidth}
              runHeight={runHeight}
              isSelected={
                selectedIds[slideIdx] === variant.id || variant.is_selected
              }
              onSelect={() =>
                selectMutation.mutate({ variantId: variant.id, slideIdx })
              }
              isSelecting={selectMutation.isPending}
            />
          );
        })}
      </div>

      {isRunning && currentVariants.length === 0 && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="animate-spin" size={14} />
          Generating slide {currentSlide + 1}...
        </div>
      )}

      {!isRunning && run.variants.length === 0 && (
        <p className="text-muted-foreground text-sm py-4 text-center">
          No variants were generated. All providers failed.
        </p>
      )}
    </div>
  );
}

function VariantCard({
  variant,
  runWidth,
  runHeight,
  isSelected,
  onSelect,
  isSelecting,
}: Readonly<{
  variant: GenerationVariant;
  runWidth: number;
  runHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  isSelecting: boolean;
}>) {
  const [showHtml, setShowHtml] = useState(true);
  const hasHtml = Boolean(variant.generated_html);
  const codeTabClassName = showHtml
    ? "hover:bg-accent"
    : "bg-foreground text-background";

  return (
    <div
      data-testid={`compare-provider-${variant.provider}`}
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-colors",
        isSelected
          ? "border-foreground bg-accent"
          : "border-border hover:border-foreground/50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} />
          <span className="font-medium text-sm">{variant.provider}</span>
          <span className="text-xs text-muted-foreground">
            {variant.model_id}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasHtml && (
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button
                onClick={() => setShowHtml(true)}
                className={cn(
                  "px-2 py-1 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  showHtml
                    ? "bg-foreground text-background"
                    : "hover:bg-accent",
                )}
              >
                <Eye size={11} /> Preview
              </button>
              <button
                onClick={() => setShowHtml(false)}
                className={cn(
                  "px-2 py-1 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  codeTabClassName,
                )}
              >
                <Code size={11} /> Code
              </button>
            </div>
          )}
          {isSelected && <CheckCircle size={16} className="text-foreground" />}
        </div>
      </div>

      {/* Content preview */}
      {hasHtml && showHtml ? (
        <HtmlPreview
          html={variant.generated_html}
          width={runWidth}
          height={runHeight}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap min-h-[60px]">
          {variant.generated_text || variant.generated_html.slice(0, 200)}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          data-testid="select-variant"
          onClick={onSelect}
          disabled={isSelected || isSelecting}
          className={cn(
            "flex-1 text-sm py-2 px-3 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isSelected
              ? "bg-foreground text-background cursor-default"
              : "border border-border hover:bg-accent",
          )}
        >
          {isSelected ? "Selected" : "Select variant"}
        </button>
      </div>
    </div>
  );
}

function HtmlPreview({
  html,
  width,
  height,
}: Readonly<{
  html: string;
  width: number;
  height: number;
}>) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-border bg-white"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <iframe
        srcDoc={html}
        sandbox="allow-same-origin"
        title="Design preview"
        className="absolute inset-0 w-full h-full border-none"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
