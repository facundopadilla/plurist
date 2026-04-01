import { useCallback } from "react";
import { useCanvasStore } from "../canvas-store";

/**
 * Hook that connects html_block SSE events from the chat stream
 * to canvas store actions (addSlideFromChat / updateSlideVariant).
 */
export function useChatToCanvas() {
  const addSlideFromChat = useCanvasStore((s) => s.addSlideFromChat);
  const updateSlideVariant = useCanvasStore((s) => s.updateSlideVariant);
  const slides = useCanvasStore((s) => s.slides);

  const onHtmlBlock = useCallback(
    (slideIndex: number, html: string, provider: string) => {
      // Check if a slide already exists for this index
      const existingEntry = Array.from(slides.entries()).find(
        ([, data]) => data.slideIndex === slideIndex,
      );

      if (existingEntry) {
        updateSlideVariant(slideIndex, html, provider);
      } else {
        addSlideFromChat(slideIndex, html, provider);
      }
    },
    [slides, addSlideFromChat, updateSlideVariant],
  );

  return { onHtmlBlock };
}
