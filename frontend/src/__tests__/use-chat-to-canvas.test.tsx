import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";

import { useCanvasStore } from "../features/canvas/canvas-store";
import { useChatToCanvas } from "../features/canvas/hooks/use-chat-to-canvas";
import { cleanupDom, render, waitFor } from "./test-dom";

function HookHarness({
  onReady,
}: {
  onReady: (value: ReturnType<typeof useChatToCanvas>) => void;
}) {
  const value = useChatToCanvas();

  useEffect(() => {
    onReady(value);
  }, [onReady, value]);

  return null;
}

describe("useChatToCanvas", () => {
  let handlers: ReturnType<typeof useChatToCanvas> | null = null;

  beforeEach(async () => {
    handlers = null;
    useCanvasStore.setState(useCanvasStore.getInitialState());

    render(<HookHarness onReady={(value) => (handlers = value)} />);

    await waitFor(() => {
      expect(handlers).not.toBeNull();
    });
  });

  afterEach(() => {
    cleanupDom();
  });

  it("creates a new slide at the next available index when an occupied index is returned without selection", () => {
    useCanvasStore.getState().addSlide(0, "<p>Zero</p>", "openai", 1);
    useCanvasStore.getState().addSlide(1, "<p>One</p>", "openai", 1);
    useCanvasStore.getState().addSlide(2, "<p>Two</p>", "openai", 1);

    handlers?.onHtmlBlock(1, "<p>Three</p>", "openai");

    const slides = Array.from(useCanvasStore.getState().slides.values()).sort(
      (a, b) => a.slideIndex - b.slideIndex,
    );

    expect(slides.map((slide) => slide.slideIndex)).toEqual([0, 1, 2, 3]);
    expect(slides[3]?.variants[0]?.html).toBe("<p>Three</p>");
  });

  it("updates the selected slide when the returned index matches the selected slide", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(1, "<p>Original</p>", "openai", 1);
    useCanvasStore.getState().setSelectedSlideIds([slideId]);

    handlers?.onHtmlBlock(1, "<p>Updated</p>", "openai");

    const slide = useCanvasStore.getState().slides.get(slideId);
    expect(slide?.variants[0]?.html).toBe("<p>Updated</p>");
    expect(useCanvasStore.getState().slides.size).toBe(1);
  });

  it("does not update an existing unselected slide when selection scope is active", () => {
    const firstSlideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Zero</p>", "openai", 1);
    useCanvasStore.getState().addSlide(1, "<p>One</p>", "openai", 1);
    useCanvasStore.getState().setSelectedSlideIds([firstSlideId]);

    handlers?.onHtmlBlock(1, "<p>Should be new</p>", "openai");

    const slides = Array.from(useCanvasStore.getState().slides.values()).sort(
      (a, b) => a.slideIndex - b.slideIndex,
    );

    expect(slides.map((slide) => slide.slideIndex)).toEqual([0, 1, 2]);
    expect(slides[1]?.variants[0]?.html).toBe("<p>One</p>");
    expect(slides[2]?.variants[0]?.html).toBe("<p>Should be new</p>");
  });

  it("uses live store state when determining the next available slide index", () => {
    useCanvasStore.getState().addSlide(0, "<p>Zero</p>", "openai", 1);
    useCanvasStore.getState().addSlide(1, "<p>One</p>", "openai", 1);

    useCanvasStore.getState().addSlide(2, "<p>Inserted later</p>", "openai", 1);

    handlers?.onHtmlBlock(1, "<p>Newest</p>", "openai");

    const slides = Array.from(useCanvasStore.getState().slides.values()).sort(
      (a, b) => a.slideIndex - b.slideIndex,
    );

    expect(slides.map((slide) => slide.slideIndex)).toEqual([0, 1, 2, 3]);
    expect(slides[2]?.variants[0]?.html).toBe("<p>Inserted later</p>");
    expect(slides[3]?.variants[0]?.html).toBe("<p>Newest</p>");
  });

  it("reports a safe failure when the targeted selector cannot be patched", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<section><h2>Hola</h2></section>", "openai", 1);

    const result = handlers?.onElementPatch(
      slideId,
      1,
      "section > p",
      "<p>Nuevo</p>",
    );

    expect(result?.applied).toBe(false);
    expect(result?.error).toMatch(/Target element not found/);
    expect(
      useCanvasStore.getState().slides.get(slideId)?.variants[0]?.html,
    ).toBe("<section><h2>Hola</h2></section>");
  });
});
