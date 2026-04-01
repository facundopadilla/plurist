import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addHtmlShapeAnnotation,
  copyHtmlShapeAsJpg,
  copyHtmlShapeAsPng,
  copyHtmlShapeCode,
  deleteHtmlShape,
  duplicateCurrentHtmlShapeVariant,
  downloadHtmlShapeExportBundle,
  downloadHtmlShapeCode,
  duplicateHtmlShape,
  exportHtmlShapeToJpg,
  exportHtmlShapeToPng,
  exportHtmlShapeToSvg,
  openHtmlShapeEditor,
  openHtmlShapeContextualAi,
  renameHtmlShape,
  removeCurrentHtmlShapeVariant,
  renameCurrentHtmlShapeVariant,
  toggleHtmlShapeFavorite,
} from "../features/canvas/context-menu/html-shape-actions";
import { useCanvasStore } from "../features/canvas/canvas-store";

const { exportSlideToBlob, downloadBlob, downloadHtmlShapeBundle } = vi.hoisted(
  () => ({
    exportSlideToBlob: vi.fn(),
    downloadBlob: vi.fn(),
    downloadHtmlShapeBundle: vi.fn(),
  }),
);

vi.mock("../features/canvas/export/use-snapdom-export", () => ({
  exportSlideToBlob,
  downloadBlob,
}));

vi.mock("../features/canvas/export/export-zip", () => ({
  downloadHtmlShapeBundle,
}));

describe("html-shape-actions", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
    exportSlideToBlob.mockReset();
    downloadBlob.mockReset();
    downloadHtmlShapeBundle.mockReset();
    vi.restoreAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.stubGlobal(
      "ClipboardItem",
      vi.fn(function ClipboardItem(data: Record<string, Blob>) {
        return data;
      }),
    );
  });

  it("openHtmlShapeEditor selects the shape and enters edit mode", () => {
    const editor = { select: vi.fn() };

    openHtmlShapeEditor(editor as never, "shape:slide-1");

    expect(editor.select).toHaveBeenCalledWith("shape:slide-1");
    expect(useCanvasStore.getState().editingNodeId).toBe("shape:slide-1");
  });

  it("exportHtmlShapeToPng exports the active variant and downloads the blob", async () => {
    exportSlideToBlob.mockResolvedValue(
      new Blob(["png"], { type: "image/png" }),
    );
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Export</p>", "openai", 1);

    const blob = await exportHtmlShapeToPng(slideId);

    expect(exportSlideToBlob).toHaveBeenCalledWith({
      html: "<p>Export</p>",
      width: 1080,
      height: 1080,
      format: "png",
    });
    expect(downloadBlob).toHaveBeenCalledWith(blob, `${slideId}.png`);
  });

  it("exportHtmlShapeToJpg exports the active variant and downloads a jpg blob", async () => {
    exportSlideToBlob.mockResolvedValue(
      new Blob(["jpg"], { type: "image/jpeg" }),
    );
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Export JPG</p>", "openai", 1);

    const blob = await exportHtmlShapeToJpg(slideId);

    expect(exportSlideToBlob).toHaveBeenCalledWith({
      html: "<p>Export JPG</p>",
      width: 1080,
      height: 1080,
      format: "jpeg",
    });
    expect(downloadBlob).toHaveBeenCalledWith(blob, `${slideId}.jpg`);
  });

  it("copies html code to the clipboard", async () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Copy me</p>", "openai", 1);

    await copyHtmlShapeCode(slideId);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "<p>Copy me</p>",
    );
  });

  it("copies png to the clipboard", async () => {
    exportSlideToBlob.mockResolvedValue(
      new Blob(["png"], { type: "image/png" }),
    );
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Copy png</p>", "openai", 1);

    await copyHtmlShapeAsPng(slideId);

    expect(exportSlideToBlob).toHaveBeenCalledWith({
      html: "<p>Copy png</p>",
      width: 1080,
      height: 1080,
      format: "png",
    });
    expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
  });

  it("copies jpg to the clipboard", async () => {
    exportSlideToBlob.mockResolvedValue(
      new Blob(["jpg"], { type: "image/jpeg" }),
    );
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Copy jpg</p>", "openai", 1);

    await copyHtmlShapeAsJpg(slideId);

    expect(exportSlideToBlob).toHaveBeenCalledWith({
      html: "<p>Copy jpg</p>",
      width: 1080,
      height: 1080,
      format: "jpeg",
    });
    expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
  });

  it("downloads html source as a file", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Download html</p>", "openai", 1);

    const blob = downloadHtmlShapeCode(slideId);

    expect(downloadBlob).toHaveBeenCalledWith(blob, `${slideId}.html`);
    expect(blob.type).toContain("text/html");
  });

  it("exportHtmlShapeToSvg exports svg and downloads the blob", async () => {
    exportSlideToBlob.mockResolvedValue(
      new Blob(["svg"], { type: "image/svg+xml" }),
    );
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Export SVG</p>", "openai", 1);

    const blob = await exportHtmlShapeToSvg(slideId);

    expect(exportSlideToBlob).toHaveBeenCalledWith({
      html: "<p>Export SVG</p>",
      width: 1080,
      height: 1080,
      format: "svg",
    });
    expect(downloadBlob).toHaveBeenCalledWith(blob, `${slideId}.svg`);
  });

  it("deleteHtmlShape removes the slide and closes active edit mode", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Delete</p>", "openai", 1);
    useCanvasStore.getState().enterEditMode("shape:slide-123");

    deleteHtmlShape(slideId, "shape:slide-123");

    expect(useCanvasStore.getState().slides.has(slideId)).toBe(false);
    expect(useCanvasStore.getState().editingNodeId).toBeNull();
  });

  it("duplicateHtmlShape delegates to the store", () => {
    const duplicateSlide = vi.fn(() => "slide-2");
    useCanvasStore.setState({ duplicateSlide });

    expect(duplicateHtmlShape("slide-1")).toBe("slide-2");
    expect(duplicateSlide).toHaveBeenCalledWith("slide-1");
  });

  it("renames a frame using prompt input", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Rename</p>", "openai", 1);
    vi.spyOn(window, "prompt").mockReturnValue("Landing Hero");

    const name = renameHtmlShape(slideId);

    expect(name).toBe("Landing Hero");
    expect(useCanvasStore.getState().slides.get(slideId)?.name).toBe(
      "Landing Hero",
    );
  });

  it("toggles favorite state for a frame", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Fav</p>", "openai", 1);

    toggleHtmlShapeFavorite(slideId);
    expect(useCanvasStore.getState().slides.get(slideId)?.isFavorite).toBe(
      true,
    );

    toggleHtmlShapeFavorite(slideId);
    expect(useCanvasStore.getState().slides.get(slideId)?.isFavorite).toBe(
      false,
    );
  });

  it("adds an annotation and opens the annotation panel", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Note</p>", "openai", 1);
    vi.spyOn(window, "prompt").mockReturnValue("Ajustar spacing del título");

    const annotationId = addHtmlShapeAnnotation(slideId);

    expect(annotationId).toBeTruthy();
    expect(useCanvasStore.getState().annotationEditorSlideId).toBe(slideId);
    expect(useCanvasStore.getState().slides.get(slideId)?.annotations).toEqual([
      expect.objectContaining({ text: "Ajustar spacing del título" }),
    ]);
  });

  it("opens the contextual AI panel for the selected mode", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>AI</p>", "openai", 1);

    openHtmlShapeContextualAi(slideId, "regenerate");

    expect(useCanvasStore.getState().contextualAiTarget).toEqual({
      slideId,
      mode: "regenerate",
    });
  });

  it("opens the contextual AI panel for responsive mobile generation", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>AI Mobile</p>", "openai", 1);

    openHtmlShapeContextualAi(slideId, "mobile");

    expect(useCanvasStore.getState().contextualAiTarget).toEqual({
      slideId,
      mode: "mobile",
    });
  });

  it("renames the current active variant from the action helper", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Rename variant</p>", "openai", 1);
    vi.spyOn(window, "prompt").mockReturnValue("Variant premium");

    const result = renameCurrentHtmlShapeVariant(slideId);

    expect(result).toBe("Variant premium");
    expect(
      useCanvasStore.getState().slides.get(slideId)?.variants[0].name,
    ).toBe("Variant premium");
  });

  it("duplicates the current active variant from the action helper", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Duplicate variant</p>", "openai", 1);

    const duplicateId = duplicateCurrentHtmlShapeVariant(slideId);

    expect(duplicateId).toBe(2);
    expect(useCanvasStore.getState().slides.get(slideId)?.activeVariantId).toBe(
      2,
    );
  });

  it("removes the current active variant from the action helper", () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Remove variant</p>", "openai", 1);
    useCanvasStore.getState().duplicateVariant(slideId, 1);

    removeCurrentHtmlShapeVariant(slideId);

    expect(
      useCanvasStore.getState().slides.get(slideId)?.variants,
    ).toHaveLength(1);
    expect(useCanvasStore.getState().slides.get(slideId)?.activeVariantId).toBe(
      1,
    );
  });

  it("downloads a bundle with html and preview assets", async () => {
    exportSlideToBlob
      .mockResolvedValueOnce(new Blob(["png"], { type: "image/png" }))
      .mockResolvedValueOnce(new Blob(["jpg"], { type: "image/jpeg" }))
      .mockResolvedValueOnce(new Blob(["svg"], { type: "image/svg+xml" }));
    downloadHtmlShapeBundle.mockResolvedValue(
      new Blob(["zip"], { type: "application/zip" }),
    );
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Bundle</p>", "openai", 1);

    await downloadHtmlShapeExportBundle(slideId);

    expect(exportSlideToBlob).toHaveBeenCalledTimes(3);
    expect(downloadHtmlShapeBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        slideId,
        html: "<p>Bundle</p>",
        formatWidth: 1080,
        formatHeight: 1080,
        assets: expect.arrayContaining([
          expect.objectContaining({ filename: "preview.png" }),
          expect.objectContaining({ filename: "preview.jpg" }),
          expect.objectContaining({ filename: "preview.svg" }),
        ]),
      }),
    );
  });
});
