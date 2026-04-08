/**
 * IframeShapeUtil — tldraw ShapeUtil for AI-generated HTML content frames.
 *
 * Renders each content artifact (Instagram post, slide, story, website) as
 * a sandboxed iframe with srcdoc. Supports resize with locked aspect ratio.
 *
 * Editing is handled via the iframe-bridge overlay system:
 *  - Double-click the shape → enters edit mode (store.enterEditMode)
 *  - IframeShapeComponent renders EditModeOverlay + VariantTabs when editing
 *  - iframe-bridge.ts manages all inline DOM manipulation (contentEditable, etc.)
 *
 * IMPORTANT: iframe-bridge.ts is the source of truth for DOM editing.
 * This ShapeUtil only owns rendering, layout, and the edit-mode wiring.
 */
import {
  Geometry2d,
  Rectangle2d,
  ShapeUtil,
  TLResizeInfo,
  resizeBox,
} from "tldraw";
import {
  IFRAME_SHAPE_TYPE,
  iframeShapeProps,
  type IframeShape,
  type IframeShapeProps,
} from "./iframe-shape-types";
import { IframeShapeComponent } from "./iframe-shape-component";

export class IframeShapeUtil extends ShapeUtil<IframeShape> {
  static override readonly type = IFRAME_SHAPE_TYPE;
  static override readonly props = iframeShapeProps;

  // ── Defaults ───────────────────────────────────────────────────
  getDefaultProps(): IframeShapeProps {
    return {
      w: 400,
      h: 400,
      html: "",
      slideId: "",
      slideIndex: 0,
    };
  }

  // ── Capabilities ───────────────────────────────────────────────
  override canEdit() {
    return false; // Editing is handled by our custom overlay, not tldraw's built-in
  }

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return true; // Content formats have fixed aspect ratios (1:1, 16:9, 9:16)
  }

  // ── Geometry (hit area) ────────────────────────────────────────
  getGeometry(shape: IframeShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  // ── Resize ─────────────────────────────────────────────────────
  override onResize(shape: IframeShape, info: TLResizeInfo<IframeShape>) {
    return resizeBox(shape, info);
  }

  // ── Render ─────────────────────────────────────────────────────
  component(shape: IframeShape) {
    return <IframeShapeComponent shape={shape} />;
  }

  // ── Selection indicator ────────────────────────────────────────
  indicator(shape: IframeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} ry={6} />;
  }
}
