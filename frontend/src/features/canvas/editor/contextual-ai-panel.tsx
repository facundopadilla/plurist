import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useCanvasStore } from "../canvas-store";
import { ModelDropdown, ProviderDropdown } from "../header-dropdowns";
import { streamChatMessage } from "../chat/use-chat-stream";
import { Button } from "@/components/ui/button";
import type { VariantGenerationMeta, VariantType } from "../types";

function describeMode(
  mode: "generate" | "regenerate" | "mobile" | "tablet" | "desktop",
) {
  switch (mode) {
    case "regenerate":
      return {
        title: "Regenerate",
        action: "Regenerate",
        summary:
          "Creates a new variant of the current frame using the selected provider and model.",
      };
    case "mobile":
      return {
        title: "Generate for mobile",
        action: "Generate mobile variant",
        summary: "Adapts the current frame to a responsive mobile layout.",
      };
    case "tablet":
      return {
        title: "Generate for tablet",
        action: "Generate tablet variant",
        summary: "Adapts the current frame to a responsive tablet layout.",
      };
    case "desktop":
      return {
        title: "Generate for desktop",
        action: "Generate desktop variant",
        summary: "Adapts the current frame to a responsive desktop layout.",
      };
    default:
      return {
        title: "Generate variant",
        action: "Generate variant",
        summary:
          "Creates a variant of the current frame using the selected provider and model.",
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

  if (
    !target ||
    target.mode === "generate-variants" ||
    !slide ||
    !activeVariant
  )
    return null;

  const modeUi = describeMode(target.mode);

  const provider = config.selectedProviders[0] ?? "openai";
  const modelId = config.selectedModels?.[provider] ?? "";

  async function handleGenerate() {
    const currentTarget = target;
    const sourceVariant = activeVariant;
    if (
      !currentTarget ||
      currentTarget.mode === "generate-variants" ||
      !sourceVariant
    )
      return;

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
        onElementPatch: () => {},
        onDone: () => {
          setIsGenerating(false);
          if (!inserted) {
            setError("The AI did not return usable HTML for this frame.");
            return;
          }
          closeContextualAi();
          setInstruction("");
        },
        onError: (error) => {
          setIsGenerating(false);
          setError(error.hint || error.message);
        },
      },
    );
  }

  return (
    <aside
      className="w-[360px] border-l border-zinc-800/60 bg-zinc-950/92 backdrop-blur-xl"
      onKeyDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onKeyUp={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-zinc-300" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-50">
              {modeUi.title}
            </h3>
            <p className="text-xs text-zinc-400">{modeUi.summary}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeContextualAi}
          aria-label="Close contextual AI"
          className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="flex h-[calc(100vh-56px)] flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProviderDropdown />
          <ModelDropdown />
        </div>

        <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
          Active variant:{" "}
          <span className="font-medium text-zinc-100">#{activeVariant.id}</span>
        </div>

        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Example: make it more premium, reduce the text, make it more minimal..."
          className="min-h-[140px] w-full resize-y rounded-lg border border-zinc-800/70 bg-zinc-950/80 p-3 text-sm text-zinc-100 outline-none"
        />

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <Button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
          className="w-full justify-center rounded-lg bg-zinc-50 text-zinc-900 shadow-none hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isGenerating ? "Generating..." : modeUi.action}
        </Button>
      </div>
    </aside>
  );
}
