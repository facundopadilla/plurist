import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CodeEditorPanel } from "../features/canvas/code-editor/code-editor-panel";
import { useCanvasStore } from "../features/canvas/canvas-store";
import { cleanupDom, render, press } from "./test-dom";

// Mock Monaco to avoid loading the real editor in tests
vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    language,
    onChange,
  }: {
    value: string;
    language: string;
    onChange?: (v: string) => void;
  }) => (
    <textarea
      data-testid="mock-monaco"
      data-language={language}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

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

describe("CodeEditorPanel", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanupDom();
  });

  it("renders file tree and editor area", () => {
    addTestSlide("slide-1", 0, "<div>Hello</div>");
    render(<CodeEditorPanel />);

    // File tree should show
    const fileTree = document.querySelector('[data-testid="file-tree"]');
    expect(fileTree).not.toBeNull();

    // styles.css and slide files should be listed
    const cssItem = document.querySelector(
      '[data-testid="file-tree-item-styles.css"]',
    );
    expect(cssItem).not.toBeNull();

    const slideItem = document.querySelector(
      '[data-testid="file-tree-item-slide-slide-1"]',
    );
    expect(slideItem).not.toBeNull();
  });

  it("shows styles.css as the default selected file", () => {
    addTestSlide("slide-1", 0, "<div>Hello</div>");
    render(<CodeEditorPanel />);

    const cssItem = document.querySelector(
      '[data-testid="file-tree-item-styles.css"]',
    );
    expect(cssItem?.getAttribute("aria-selected")).toBe("true");
  });

  it("switches to a slide file when clicked", () => {
    addTestSlide("slide-1", 0, "<div>Hello</div>");
    render(<CodeEditorPanel />);

    const slideItem = document.querySelector(
      '[data-testid="file-tree-item-slide-slide-1"]',
    ) as HTMLElement;
    press(slideItem);

    expect(slideItem.getAttribute("aria-selected")).toBe("true");

    // The mock editor should show HTML language
    const editor = document.querySelector(
      '[data-testid="mock-monaco"]',
    ) as HTMLTextAreaElement;
    expect(editor.getAttribute("data-language")).toBe("html");
  });

  it("renders the Monaco wrapper with the active file content", () => {
    useCanvasStore.getState().setGlobalStyles("body { margin: 0; }");
    render(<CodeEditorPanel />);

    const editor = document.querySelector(
      '[data-testid="mock-monaco"]',
    ) as HTMLTextAreaElement;
    expect(editor.getAttribute("data-language")).toBe("css");
    expect(editor.value).toBe("body { margin: 0; }");
  });

  it("shows file tree with styles.css even when no slides exist", () => {
    render(<CodeEditorPanel />);

    const fileTree = document.querySelector('[data-testid="file-tree"]');
    expect(fileTree).not.toBeNull();

    const cssItem = document.querySelector(
      '[data-testid="file-tree-item-styles.css"]',
    );
    expect(cssItem).not.toBeNull();
  });
});
