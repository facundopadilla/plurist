import type { Editor, TLShapeId } from "tldraw";
import { useCanvasStore } from "../canvas-store";
import type { ContextualAiMode } from "../types";
import { downloadHtmlExport } from "../export/export-html";
import { downloadHtmlShapeBundle } from "../export/export-zip";
import {
  downloadBlob,
  exportSlideToBlob,
  type ExportFormat,
} from "../export/use-snapdom-export";

function getActiveSlideVariant(slideId: string) {
  const { slides } = useCanvasStore.getState();
  const slide = slides.get(slideId);
  if (!slide) {
    throw new Error("Slide not found");
  }

  const activeVariant = slide.variants.find(
    (variant) => variant.id === slide.activeVariantId,
  );
  if (!activeVariant) {
    throw new Error("Active variant not found");
  }

  return { slide, activeVariant };
}

async function blobToClipboardItem(blob: Blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported in this browser");
  }

  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

export function openHtmlShapeEditor(
  editor: Pick<Editor, "select"> | null,
  shapeId: string | TLShapeId,
) {
  editor?.select(shapeId as TLShapeId);
  const store = useCanvasStore.getState();
  store.enterEditMode(String(shapeId));
  store.setActivePanel("code");
}

export function duplicateHtmlShape(slideId: string) {
  return useCanvasStore.getState().duplicateSlide(slideId);
}

export async function exportHtmlShape(
  slideId: string,
  format: Extract<ExportFormat, "png" | "jpeg" | "svg">,
) {
  const { config } = useCanvasStore.getState();
  const { activeVariant } = getActiveSlideVariant(slideId);

  const blob = await exportSlideToBlob({
    html: activeVariant.html,
    width: config.formatWidth,
    height: config.formatHeight,
    format,
  });

  const extension = format === "jpeg" ? "jpg" : format;
  downloadBlob(blob, `${slideId}.${extension}`);
  return blob;
}

export function copyHtmlShapeCode(slideId: string) {
  const { activeVariant } = getActiveSlideVariant(slideId);
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard text copy is not supported in this browser");
  }

  return navigator.clipboard.writeText(activeVariant.html);
}

export async function copyHtmlShapeAsImage(
  slideId: string,
  format: Extract<ExportFormat, "png" | "jpeg">,
) {
  const { config } = useCanvasStore.getState();
  const { activeVariant } = getActiveSlideVariant(slideId);
  const blob = await exportSlideToBlob({
    html: activeVariant.html,
    width: config.formatWidth,
    height: config.formatHeight,
    format,
  });
  await blobToClipboardItem(blob);
  return blob;
}

export function downloadHtmlShapeCode(slideId: string) {
  const { activeVariant } = getActiveSlideVariant(slideId);
  return downloadHtmlExport(activeVariant.html, `${slideId}.html`);
}

export async function exportHtmlShapeToPng(slideId: string) {
  return exportHtmlShape(slideId, "png");
}

export async function exportHtmlShapeToJpg(slideId: string) {
  return exportHtmlShape(slideId, "jpeg");
}

export async function exportHtmlShapeToSvg(slideId: string) {
  return exportHtmlShape(slideId, "svg");
}

export async function copyHtmlShapeAsPng(slideId: string) {
  return copyHtmlShapeAsImage(slideId, "png");
}

export async function copyHtmlShapeAsJpg(slideId: string) {
  return copyHtmlShapeAsImage(slideId, "jpeg");
}

export function renameHtmlShape(slideId: string) {
  const { slides, renameSlide } = useCanvasStore.getState();
  const slide = slides.get(slideId);
  if (!slide) {
    throw new Error("Slide not found");
  }

  const nextName = window.prompt(
    "Renombrar frame",
    slide.name ?? `Frame ${slide.slideIndex + 1}`,
  );
  if (!nextName) {
    return null;
  }

  const trimmed = nextName.trim();
  if (!trimmed) {
    return null;
  }

  renameSlide(slideId, trimmed);
  return trimmed;
}

export function toggleHtmlShapeFavorite(slideId: string) {
  useCanvasStore.getState().toggleSlideFavorite(slideId);
}

export function addHtmlShapeAnnotation(slideId: string) {
  const state = useCanvasStore.getState();
  const note = window.prompt("New annotation", "");
  if (!note) {
    state.openAnnotationEditor(slideId);
    return null;
  }

  const annotationId = state.addSlideAnnotation(slideId, note);
  state.openAnnotationEditor(slideId);
  return annotationId;
}

export function openHtmlShapeAnnotations(slideId: string) {
  useCanvasStore.getState().openAnnotationEditor(slideId);
}

export function openHtmlShapeContextualAi(
  slideId: string,
  mode: ContextualAiMode,
) {
  useCanvasStore.getState().openContextualAi(slideId, mode);
}

export function renameCurrentHtmlShapeVariant(slideId: string) {
  const { slide } = getActiveSlideVariant(slideId);
  if (slide.activeVariantId === null) return null;
  const currentVariant = slide.variants.find(
    (variant) => variant.id === slide.activeVariantId,
  );
  if (!currentVariant) return null;
  const nextName = window.prompt(
    "Renombrar variant",
    currentVariant.name ?? "",
  );
  if (nextName === null) return null;
  useCanvasStore.getState().renameVariant(slideId, currentVariant.id, nextName);
  return nextName.trim() || null;
}

export function duplicateCurrentHtmlShapeVariant(slideId: string) {
  const { slide } = getActiveSlideVariant(slideId);
  if (slide.activeVariantId === null) return null;
  return useCanvasStore
    .getState()
    .duplicateVariant(slideId, slide.activeVariantId);
}

export function removeCurrentHtmlShapeVariant(slideId: string) {
  const { slide } = getActiveSlideVariant(slideId);
  if (slide.activeVariantId === null) return;
  useCanvasStore.getState().removeVariant(slideId, slide.activeVariantId);
}

export async function downloadHtmlShapeExportBundle(slideId: string) {
  const { config } = useCanvasStore.getState();
  const { slide, activeVariant } = getActiveSlideVariant(slideId);

  const [pngBlob, jpgBlob, svgBlob] = await Promise.all([
    exportSlideToBlob({
      html: activeVariant.html,
      width: config.formatWidth,
      height: config.formatHeight,
      format: "png",
    }),
    exportSlideToBlob({
      html: activeVariant.html,
      width: config.formatWidth,
      height: config.formatHeight,
      format: "jpeg",
    }),
    exportSlideToBlob({
      html: activeVariant.html,
      width: config.formatWidth,
      height: config.formatHeight,
      format: "svg",
    }),
  ]);

  return downloadHtmlShapeBundle({
    slideId,
    html: activeVariant.html,
    name: slide.name,
    isFavorite: slide.isFavorite,
    formatWidth: config.formatWidth,
    formatHeight: config.formatHeight,
    assets: [
      { filename: "preview.png", blob: pngBlob },
      { filename: "preview.jpg", blob: jpgBlob },
      { filename: "preview.svg", blob: svgBlob },
    ],
  });
}

export function deleteHtmlShape(slideId: string, shapeId: string) {
  const state = useCanvasStore.getState();
  if (state.editingNodeId === shapeId) {
    state.exitEditMode();
  }
  if (state.annotationEditorSlideId === slideId) {
    state.closeAnnotationEditor();
  }
  if (state.contextualAiTarget?.slideId === slideId) {
    state.closeContextualAi();
  }
  state.removeSlide(slideId);
}
