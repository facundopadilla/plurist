import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useCanvasStore } from "../canvas-store";
import { ModelDropdown, ProviderDropdown } from "../header-dropdowns";
import { streamChatMessage } from "../chat/use-chat-stream";
import type { VariantGenerationMeta, VariantType } from "../types";

function describeMode(
  mode: "generate" | "regenerate" | "mobile" | "tablet" | "desktop",
) {
  switch (mode) {
    case "regenerate":
      return {
        title: "Volver a generar",
        action: "Volver a generar",
        summary:
          "Crea una nueva variante del frame actual usando el provider y modelo elegidos.",
      };
    case "mobile":
      return {
        title: "Generar para mobile",
        action: "Generar variante mobile",
        summary: "Adapta el frame actual a un layout responsive para mobile.",
      };
    case "tablet":
      return {
        title: "Generar para tablet",
        action: "Generar variante tablet",
        summary: "Adapta el frame actual a un layout responsive para tablet.",
      };
    case "desktop":
      return {
        title: "Generar para desktop",
        action: "Generar variante desktop",
        summary: "Adapta el frame actual a un layout responsive para desktop.",
      };
    default:
      return {
        title: "Generar variante",
        action: "Generar variante",
        summary:
          "Crea una variante del frame actual usando el provider y modelo elegidos.",
      };
  }
}

function buildContextualPrompt(
  html: string,
  instruction: string,
  mode: "generate" | "regenerate" | "mobile" | "tablet" | "desktop",
) {
  const intent =
    mode === "regenerate"
      ? "Regenerate"
      : mode === "mobile" || mode === "tablet" || mode === "desktop"
        ? `Generate a responsive ${mode} variation`
        : "Generate a new variation";
  const detail = instruction.trim()
    ? `Additional instruction: ${instruction.trim()}`
    : mode === "mobile" || mode === "tablet" || mode === "desktop"
      ? `Adapt the same creative concept to a ${mode} layout while preserving clarity and hierarchy.`
      : "Keep the concept but explore a fresh creative direction.";

  const responsiveRule =
    mode === "mobile" || mode === "tablet" || mode === "desktop"
      ? `This output MUST be tailored for the ${mode} breakpoint. Adjust spacing, hierarchy, line lengths, and composition appropriately.`
      : "";

  return `${intent} of this single social post HTML. Return ONLY one HTML result wrapped with <!-- SLIDE_START 0 --> and <!-- SLIDE_END -->. Do not add explanations outside the HTML block. Preserve editability and visual polish.

${detail}
${responsiveRule}

Current HTML:
${html}`;
}

export function ContextualAiPanel() {
  const target = useCanvasStore((s) => s.contextualAiTarget);
  const slides = useCanvasStore((s) => s.slides);
  const config = useCanvasStore((s) => s.config);
  const closeContextualAi = useCanvasStore((s) => s.closeContextualAi);
  const addGeneratedVariantToSlide = useCanvasStore(
    (s) => s.addGeneratedVariantToSlide,
  );
  const getResponsiveVariantForSlide = useCanvasStore(
    (s) => s.getResponsiveVariantForSlide,
  );
  const replaceResponsiveVariant = useCanvasStore(
    (s) => s.replaceResponsiveVariant,
  );
  const [instruction, setInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slide = useMemo(
    () => (target ? slides.get(target.slideId) : undefined),
    [slides, target],
  );

  const activeVariant = useMemo(
    () =>
      slide?.variants.find((variant) => variant.id === slide.activeVariantId),
    [slide],
  );

  if (!target || !slide || !activeVariant) return null;

  const modeUi = describeMode(target.mode);

  const provider = config.selectedProviders[0] ?? "openai";
  const modelId = config.selectedModels?.[provider] ?? "";

  async function handleGenerate() {
    const currentTarget = target;
    const sourceVariant = activeVariant;
    if (!currentTarget || !sourceVariant) return;

    setError(null);
    setIsGenerating(true);

    let inserted = false;

    await streamChatMessage(
      {
        conversationId: useCanvasStore.getState().conversationId,
        messages: [
          {
            role: "user",
            content: buildContextualPrompt(
              sourceVariant.html,
              instruction,
              currentTarget.mode,
            ),
          },
        ],
        provider,
        modelId,
        projectId: config.projectId,
        formatKey: config.formatKey,
        network: config.network,
        mode: "build",
      },
      {
        onToken: () => {},
        onHtmlBlock: (_slideIndex, html) => {
          if (inserted) return;
          inserted = true;
          const variantType: VariantType =
            currentTarget.mode === "mobile" ||
            currentTarget.mode === "tablet" ||
            currentTarget.mode === "desktop"
              ? currentTarget.mode
              : "default";
          const metadata: VariantGenerationMeta = {
            sourcePrompt: instruction.trim(),
            sourceVariantId: sourceVariant.id,
            mode: currentTarget.mode,
            provider,
            modelId,
            variantType,
            derivedFromVariantId: sourceVariant.id,
          };

          if (
            currentTarget.mode === "mobile" ||
            currentTarget.mode === "tablet" ||
            currentTarget.mode === "desktop"
          ) {
            const existingVariantId = getResponsiveVariantForSlide(
              currentTarget.slideId,
              currentTarget.mode,
            );
            if (existingVariantId !== null) {
              replaceResponsiveVariant(
                currentTarget.slideId,
                currentTarget.mode,
                html,
                provider,
                modelId,
                metadata,
              );
              return;
            }
          }

          addGeneratedVariantToSlide(
            currentTarget.slideId,
            html,
            provider,
            modelId,
            metadata,
          );
        },
        onDone: () => {
          setIsGenerating(false);
          if (!inserted) {
            setError("La IA no devolvió HTML utilizable para este frame.");
            return;
          }
          closeContextualAi();
          setInstruction("");
        },
        onError: (message) => {
          setIsGenerating(false);
          setError(message);
        },
      },
    );
  }

  return (
    <aside className="w-[360px] border-l border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {modeUi.title}
            </h3>
            <p className="text-xs text-muted-foreground">{modeUi.summary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeContextualAi}
          className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Cerrar IA contextual"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex h-[calc(100vh-56px)] flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProviderDropdown />
          <ModelDropdown />
        </div>

        <div className="rounded-md border border-border bg-background/70 p-3 text-xs text-muted-foreground">
          Variant activa:{" "}
          <span className="font-medium text-foreground">
            #{activeVariant.id}
          </span>
        </div>

        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Ej: hacelo más premium, menos texto, más minimalista..."
          className="min-h-[140px] w-full resize-y rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none"
        />

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {isGenerating ? "Generando..." : modeUi.action}
        </button>
      </div>
    </aside>
  );
}
