import { useCallback } from "react";
import { useCanvasStore } from "../canvas-store";

/**
 * Hook that adds a new slide node to the canvas at the next available position.
 * Auto-layout: horizontal row with gaps.
 */
export function useAddSlide() {
  const addSlide = useCanvasStore((s) => s.addSlide);
  const slides = useCanvasStore((s) => s.slides);

  const addTestSlide = useCallback(
    (html: string, provider = "test") => {
      const nextIndex = slides.size;
      addSlide(nextIndex, html, provider, Date.now());
    },
    [slides, addSlide],
  );

  return { addTestSlide };
}
