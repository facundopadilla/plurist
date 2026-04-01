import type { DraftVariant } from "../content/types";
import type { SlideData } from "./types";

export function getNextVariantId(variants: SlideData["variants"]): number {
  return Math.max(0, ...variants.map((variant) => variant.id)) + 1;
}

export function createDefaultVariant(
  id: number,
  provider: string,
  html: string,
  modelId = "",
) {
  return {
    id,
    name: undefined,
    provider,
    modelId,
    html,
    text: "",
    variantType: "default" as const,
    derivedFromVariantId: null,
  };
}

export function createSlideData(
  slideIndex: number,
  variants: SlideData["variants"],
  activeVariantId: number | null,
): SlideData {
  return {
    slideIndex,
    variants,
    activeVariantId,
    name: `Frame ${slideIndex + 1}`,
    isFavorite: false,
    annotations: [],
  };
}

export function normalizeDraftVariant(variant: DraftVariant) {
  return {
    id: variant.id,
    name:
      String(
        (variant.generation_meta as Record<string, unknown> | undefined)
          ?.variantName ?? "",
      ) || undefined,
    provider: variant.provider,
    modelId: variant.model_id,
    html: variant.generated_html,
    text: variant.generated_text,
    variantType: variant.variant_type ?? "default",
    derivedFromVariantId: variant.derived_from_variant_id ?? null,
    generationMeta: variant.generation_meta,
  };
}
