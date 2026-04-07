import {
  Geometry2d,
  Rectangle2d,
  ShapeUtil,
  TLResizeInfo,
  resizeBox,
} from "tldraw";
import {
  HTML_SHAPE_TYPE,
  htmlShapeProps,
  type HtmlShape,
  type HtmlShapeProps,
} from "./html-shape-types";
import { HtmlShapeComponent } from "./html-shape-component";

export class HtmlShapeUtil extends ShapeUtil<HtmlShape> {
  static override type = HTML_SHAPE_TYPE;
  static override props = htmlShapeProps;

  getDefaultProps(): HtmlShapeProps {
    return {
      w: 400,
      h: 400,
      html: "",
      slideId: "",
      slideIndex: 0,
      formatWidth: 1080,
      formatHeight: 1080,
    };
  }

  /**
   * Tells tldraw this shape supports editing mode.
   *
   * When true, tldraw handles the full double-click → editing lifecycle:
   *   - Double-click on unselected shape: select → onDoubleClick → startEditingShape
   *   - Double-click on already-selected shape: startEditingShape (via canEditShape check)
   *
   * Both paths call `editor.setEditingShape(shape)` and transition to `editing_shape` state.
   * The component detects this via `useIsEditing(shape.id)` and activates the InlineEditController.
   */
  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return true;
  }

  getGeometry(shape: HtmlShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: HtmlShape, info: TLResizeInfo<HtmlShape>) {
    return resizeBox(shape, info);
  }

  /**
   * Called when the user double-clicks the shape (target: "shape" path only).
   *
   * We intentionally return `undefined` (no shape partial) so tldraw proceeds
   * to its `canEditShape` check and calls `startEditingShape()`. The component
   * then picks up the editing state reactively via `useIsEditing`.
   *
   * NOTE: This handler is NOT called when double-clicking an already-selected
   * shape (target: "selection" path). That path goes directly to
   * `canEditShape → startEditingShape`. This is why we no longer call
   * `store.enterEditMode()` here — the component syncs from tldraw's state.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override onDoubleClick(_shape: HtmlShape) {
    // Return undefined → tldraw proceeds to startEditingShape.
    return undefined;
  }

  component(shape: HtmlShape) {
    return <HtmlShapeComponent shape={shape} />;
  }

  indicator(shape: HtmlShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} ry={6} />;
  }
}
