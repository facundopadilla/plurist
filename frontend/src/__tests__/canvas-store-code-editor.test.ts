import { describe, it, expect, beforeEach } from "vitest";
import { useCanvasStore } from "../features/canvas/canvas-store";
import type { VirtualFile } from "../features/canvas/types";

function resetStore() {
  useCanvasStore.setState({
    slides: new Map(),
    globalStyles: "",
    updateEpoch: 0,
    isStreaming: false,
    editor: null,
  } as never);
}

function addTestSlide(
  slideId: string,
  slideIndex: number,
  html: string,
  provider = "openai",
) {
  const slides = new Map(useCanvasStore.getState().slides);
  slides.set(slideId, {
    slideIndex,
    variants: [
      {
        id: 1,
        provider,
        modelId: "gpt-4o",
        html,
        text: "",
      },
    ],
    activeVariantId: 1,
  });
  useCanvasStore.setState({ slides } as never);
}

describe("Canvas Store — Code Editor Foundation", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("globalStyles", () => {
    it("defaults to empty string", () => {
      const state = useCanvasStore.getState();
      expect(state.globalStyles).toBe("");
    });

    it("setGlobalStyles updates the value", () => {
      const { setGlobalStyles } = useCanvasStore.getState();
      setGlobalStyles("body { color: red; }");
      expect(useCanvasStore.getState().globalStyles).toBe(
        "body { color: red; }",
      );
    });

    it("setGlobalStyles can be set to empty string", () => {
      const { setGlobalStyles } = useCanvasStore.getState();
      setGlobalStyles("h1 { font-size: 2rem; }");
      setGlobalStyles("");
      expect(useCanvasStore.getState().globalStyles).toBe("");
    });
  });

  describe("updateEpoch", () => {
    it("starts at 0", () => {
      expect(useCanvasStore.getState().updateEpoch).toBe(0);
    });

    it("bumpEpoch increments by 1", () => {
      const { bumpEpoch } = useCanvasStore.getState();
      bumpEpoch();
      expect(useCanvasStore.getState().updateEpoch).toBe(1);
    });

    it("bumpEpoch increments monotonically", () => {
      const { bumpEpoch } = useCanvasStore.getState();
      bumpEpoch();
      bumpEpoch();
      bumpEpoch();
      expect(useCanvasStore.getState().updateEpoch).toBe(3);
    });
  });

  describe("getVirtualFileTree", () => {
    it("returns styles.css as first entry when no slides exist", () => {
      const { getVirtualFileTree } = useCanvasStore.getState();
      const tree = getVirtualFileTree();

      expect(tree).toHaveLength(1);
      expect(tree[0]).toEqual<VirtualFile>({
        id: "styles.css",
        filename: "styles.css",
        language: "css",
        content: "",
        readOnly: false,
      });
    });

    it("returns styles.css with globalStyles content", () => {
      const { setGlobalStyles } = useCanvasStore.getState();
      setGlobalStyles("body { margin: 0; }");

      const tree = useCanvasStore.getState().getVirtualFileTree();
      expect(tree[0].content).toBe("body { margin: 0; }");
    });

    it("returns slide files after styles.css", () => {
      addTestSlide("slide-a", 0, "<div>Slide 1</div>");
      addTestSlide("slide-b", 1, "<div>Slide 2</div>");

      const tree = useCanvasStore.getState().getVirtualFileTree();

      expect(tree).toHaveLength(3);
      expect(tree[0].filename).toBe("styles.css");
      expect(tree[1].filename).toBe("slide-1.html");
      expect(tree[2].filename).toBe("slide-2.html");
    });

    it("orders slides by slideIndex", () => {
      addTestSlide("slide-z", 2, "<div>Third</div>");
      addTestSlide("slide-a", 0, "<div>First</div>");
      addTestSlide("slide-m", 1, "<div>Second</div>");

      const tree = useCanvasStore.getState().getVirtualFileTree();
      const filenames = tree.map((f) => f.filename);

      expect(filenames).toEqual([
        "styles.css",
        "slide-1.html",
        "slide-2.html",
        "slide-3.html",
      ]);
    });

    it("includes correct slideId and variantId", () => {
      addTestSlide("slide-abc", 0, "<div>Test</div>");

      const tree = useCanvasStore.getState().getVirtualFileTree();
      const slideFile = tree[1];

      expect(slideFile.slideId).toBe("slide-abc");
      expect(slideFile.variantId).toBe(1);
      expect(slideFile.language).toBe("html");
    });

    it("includes active variant HTML as content", () => {
      addTestSlide("slide-x", 0, "<div>Hello World</div>");

      const tree = useCanvasStore.getState().getVirtualFileTree();
      expect(tree[1].content).toBe("<div>Hello World</div>");
    });

    it("marks slides as readOnly when isStreaming is true", () => {
      addTestSlide("slide-x", 0, "<div>Streaming</div>");
      useCanvasStore.setState({ isStreaming: true });

      const tree = useCanvasStore.getState().getVirtualFileTree();
      expect(tree[1].readOnly).toBe(true);
    });

    it("styles.css is never readOnly", () => {
      useCanvasStore.setState({ isStreaming: true });
      const tree = useCanvasStore.getState().getVirtualFileTree();
      expect(tree[0].readOnly).toBe(false);
    });

    it("slides are not readOnly when not streaming", () => {
      addTestSlide("slide-x", 0, "<div>Done</div>");
      useCanvasStore.setState({ isStreaming: false });

      const tree = useCanvasStore.getState().getVirtualFileTree();
      expect(tree[1].readOnly).toBe(false);
    });
  });
});
