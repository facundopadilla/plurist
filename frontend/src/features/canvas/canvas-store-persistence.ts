import type { DraftFrameMetadata, DraftVariant } from "../content/types";
import type { SlideData } from "./types";
import { normalizeDraftVariant } from "./canvas-store-variants";

export function snapshotSlidesForPersistence(slides: Map<string, SlideData>) {
  return Array.from(slides.values())
    .sort((a, b) => a.slideIndex - b.slideIndex)
    .map((slide) => ({
      slideIndex: slide.slideIndex,
      name: slide.name ?? "",
      isFavorite: slide.isFavorite ?? false,
      annotations: slide.annotations ?? [],
      activeVariantId: slide.activeVariantId,
      variants: slide.variants.map((variant) => ({
        id: variant.id,
        name: variant.name ?? "",
        provider: variant.provider,
        modelId: variant.modelId,
        html: variant.html,
        text: variant.text,
        variantType: variant.variantType ?? "default",
        derivedFromVariantId: variant.derivedFromVariantId ?? null,
        generationMeta: variant.generationMeta ?? {},
      })),
    }));
}

export function snapshotPersistedPayload(
  frameMetadata: DraftFrameMetadata[],
  variants: DraftVariant[],
) {
  const grouped = new Map<number, DraftVariant[]>();
  for (const variant of variants) {
    const slideIndex = variant.slide_index ?? 0;
    if (!grouped.has(slideIndex)) grouped.set(slideIndex, []);
    grouped.get(slideIndex)!.push(variant);
  }

  const frameByIndex = new Map(
    frameMetadata.map((frame) => [frame.slide_index, frame]),
  );

  return Array.from(grouped.keys())
    .sort((a, b) => a - b)
    .map((slideIndex) => {
      const normalizedVariants = grouped
        .get(slideIndex)!
        .map(normalizeDraftVariant);
      const activeVariant =
        normalizedVariants[normalizedVariants.length - 1] ?? null;
      return {
        slideIndex,
        name: frameByIndex.get(slideIndex)?.name ?? `Frame ${slideIndex + 1}`,
        isFavorite: frameByIndex.get(slideIndex)?.is_favorite ?? false,
        annotations: frameByIndex.get(slideIndex)?.annotations ?? [],
        activeVariantId: activeVariant?.id ?? null,
        variants: normalizedVariants,
      };
    });
}

export function shouldHydrateDraft(
  currentSlides: Map<string, SlideData>,
  frameMetadata: DraftFrameMetadata[],
  variants: DraftVariant[],
) {
  return (
    JSON.stringify(snapshotSlidesForPersistence(currentSlides)) !==
    JSON.stringify(snapshotPersistedPayload(frameMetadata, variants))
  );
}
