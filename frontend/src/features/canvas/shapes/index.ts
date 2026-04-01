/**
 * Canvas shapes — tldraw custom shape registry.
 *
 * All custom ShapeUtils for the canvas are exported here and consumed
 * by the Tldraw component in canvas-compose-page.tsx (Phase 2).
 */
import { HtmlShapeUtil } from "./html-shape-util";

export { HTML_SHAPE_TYPE } from "./html-shape-types";
export type { HtmlShape, HtmlShapeProps } from "./html-shape-types";
export { HtmlShapeUtil } from "./html-shape-util";

/** Shape utils array to pass to <Tldraw shapeUtils={...}> */
export const customShapeUtils = [HtmlShapeUtil] as const;
