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
    };
  }

  override canEdit() {
    return false;
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

  component(shape: HtmlShape) {
    return <HtmlShapeComponent shape={shape} />;
  }

  indicator(shape: HtmlShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} ry={6} />;
  }
}
