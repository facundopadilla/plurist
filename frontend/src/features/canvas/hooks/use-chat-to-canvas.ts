import { useCallback } from "react";
import { useCanvasStore } from "../canvas-store";
import { applyElementPatch } from "../chat/apply-element-patch";

/**
 * Hook that connects html_block SSE events from the chat stream
 * to canvas store actions (addSlideFromChat / updateSlideVariant).
 */
export function useChatToCanvas() {
  const onHtmlBlock = useCallback(
    (slideIndex: number, html: string, provider: string) => {
      const { slides, selectedSlideIds, addSlideFromChat, updateSlideVariant } =
        useCanvasStore.getState();

      // Check if a slide already exists for this index
      const existingEntry = Array.from(slides.entries()).find(
        ([, data]) => data.slideIndex === slideIndex,
      );

      if (existingEntry) {
        const [existingSlideId] = existingEntry;
        const isSelectedForEdit = selectedSlideIds.includes(existingSlideId);

        if (isSelectedForEdit) {
          // User explicitly selected this slide → update it
          updateSlideVariant(slideIndex, html, provider);
        } else {
          // Respect the user's explicit scope. If the model returns an index
          // outside the selected set, treat it as new generated content.
          const maxIndex = Math.max(
            ...Array.from(slides.values()).map((s) => s.slideIndex),
            -1,
          );
          addSlideFromChat(maxIndex + 1, html, provider);
        }
      } else {
        addSlideFromChat(slideIndex, html, provider);
      }
    },
    [],
  );

  const onElementPatch = useCallback(
    (
      slideId: string,
      variantId: number,
      cssPath: string,
      updatedOuterHtml: string,
    ) => {
      const { slides, updateSlideHtml } = useCanvasStore.getState();
      const slide = slides.get(slideId);
      if (!slide) {
        return {
          applied: false,
          error: "The targeted slide is no longer available.",
        };
      }

      const variant = slide.variants.find((entry) => entry.id === variantId);
      if (!variant) {
        return {
          applied: false,
          error: "The targeted slide variant is no longer available.",
        };
      }

      const result = applyElementPatch(variant.html, cssPath, updatedOuterHtml);

      if (!result.applied) {
        return result;
      }

      updateSlideHtml(slideId, variantId, result.html);
      return result;
    },
    [],
  );

  return { onHtmlBlock, onElementPatch };
}
