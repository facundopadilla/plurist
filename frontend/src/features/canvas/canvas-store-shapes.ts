import { createShapeId, type Editor, type TLShapeId } from "tldraw";
import type { CanvasConfig } from "./types";
import { HTML_SHAPE_TYPE } from "./shapes";

const SHAPE_WIDTH = 400;
const SHAPE_GAP = 48;

export function toShapeId(slideId: string): TLShapeId {
  return createShapeId(slideId);
}

export function createTldrawShape(
  editor: Editor | null,
  slideId: string,
  slideIndex: number,
  html: string,
  formatWidth: number,
  formatHeight: number,
  position?: { x: number; y: number },
): void {
  if (!editor) return;

  const shapeHeight = Math.round((formatHeight / formatWidth) * SHAPE_WIDTH);
  const x = position?.x ?? slideIndex * (SHAPE_WIDTH + SHAPE_GAP);
  const y = position?.y ?? 0;

  editor.createShape({
    id: toShapeId(slideId),
    type: HTML_SHAPE_TYPE,
    x,
    y,
    props: {
      w: SHAPE_WIDTH,
      h: shapeHeight,
      html,
      slideId,
      slideIndex,
    },
  });
}

export function removeTldrawShape(
  editor: Editor | null,
  slideId: string,
): void {
  if (!editor) return;
  const id = toShapeId(slideId);
  if (editor.getShape(id)) {
    editor.deleteShape(id);
  }
}

export function updateTldrawShapeHtml(
  editor: Editor | null,
  slideId: string,
  html: string,
): boolean {
  if (!editor) return false;
  const id = toShapeId(slideId);
  if (editor.getShape(id)) {
    editor.updateShape({
      id,
      type: HTML_SHAPE_TYPE,
      props: { html },
    });
    return true;
  }
  return false;
}

export function syncShapeHtmlOrCreate(
  editor: Editor | null,
  slideId: string,
  slideIndex: number,
  html: string,
  config: CanvasConfig,
) {
  const updated = updateTldrawShapeHtml(editor, slideId, html);
  if (!updated && editor) {
    createTldrawShape(
      editor,
      slideId,
      slideIndex,
      html,
      config.formatWidth,
      config.formatHeight,
    );
  }
}
