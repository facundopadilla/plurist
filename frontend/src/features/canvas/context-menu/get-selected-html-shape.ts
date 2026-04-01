import type { Editor, TLShape } from "tldraw";
import { HTML_SHAPE_TYPE, type HtmlShape } from "../shapes";

type ShapeSelectionReader = Pick<
  Editor,
  "getSelectedShapes" | "getShapesAtPoint" | "inputs"
>;

function isHtmlShape(shape: TLShape | null | undefined): shape is HtmlShape {
  return shape?.type === HTML_SHAPE_TYPE;
}

export function getSelectedHtmlShape(
  editor: ShapeSelectionReader,
): HtmlShape | null {
  const selectedShapes = editor.getSelectedShapes();

  if (selectedShapes.length === 1) {
    const [shape] = selectedShapes;
    if (isHtmlShape(shape)) {
      return shape;
    }
  }

  const currentPoint = editor.inputs.currentPagePoint;
  if (!currentPoint) {
    return null;
  }

  const hoveredShape = editor
    .getShapesAtPoint(currentPoint)
    .find((shape) => isHtmlShape(shape));

  return hoveredShape ?? null;
}
