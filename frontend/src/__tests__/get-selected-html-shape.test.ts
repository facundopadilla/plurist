import { describe, expect, it, vi } from "vitest";

import { getSelectedHtmlShape } from "../features/canvas/context-menu/get-selected-html-shape";

type TestEditor = {
  getSelectedShapes: () => Array<Record<string, unknown>>;
  getShapesAtPoint: () => Array<Record<string, unknown>>;
  inputs: { getCurrentPagePoint: () => { x: number; y: number } };
};

function makeEditor(shapes: Array<Record<string, unknown>>) {
  return {
    getSelectedShapes: vi.fn(() => shapes),
    getShapesAtPoint: vi.fn(() => shapes),
    inputs: { getCurrentPagePoint: vi.fn(() => ({ x: 0, y: 0 })) },
  } as unknown as TestEditor;
}

describe("getSelectedHtmlShape", () => {
  it("returns the selected html shape when exactly one is selected", () => {
    const shape = {
      id: "shape:slide-1",
      type: "html-shape",
      props: {
        slideId: "slide-1",
        slideIndex: 0,
        html: "<p>Hello</p>",
        w: 400,
        h: 400,
      },
    };

    expect(getSelectedHtmlShape(makeEditor([shape]) as never)).toBe(shape);
  });

  it("returns null when there is no selection", () => {
    expect(getSelectedHtmlShape(makeEditor([]) as never)).toBeNull();
  });

  it("returns null when multiple shapes are selected", () => {
    const shape = { id: "shape:slide-1", type: "html-shape", props: {} };
    const other = { id: "shape:slide-2", type: "html-shape", props: {} };

    const editor = makeEditor([shape, other]);
    editor.getShapesAtPoint = vi.fn(() => [shape]);

    expect(getSelectedHtmlShape(editor as never)).toBe(shape);
  });

  it("returns null when the selected shape is not an html shape", () => {
    const shape = { id: "shape:note-1", type: "geo", props: {} };

    expect(getSelectedHtmlShape(makeEditor([shape]) as never)).toBeNull();
  });

  it("falls back to the hovered html shape under the pointer", () => {
    const hoveredHtmlShape = {
      id: "shape:hovered-slide",
      type: "html-shape",
      props: {
        slideId: "slide-hovered",
        slideIndex: 1,
        html: "<p>Hover</p>",
        w: 400,
        h: 400,
      },
    };
    const editor = makeEditor([{ id: "shape:geo-1", type: "geo", props: {} }]);
    editor.getShapesAtPoint = vi.fn(() => [hoveredHtmlShape]);

    expect(getSelectedHtmlShape(editor as never)).toBe(hoveredHtmlShape);
  });
});
