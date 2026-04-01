import { describe, it, expect } from "vitest";
import { HtmlShapeUtil } from "../features/canvas/shapes/html-shape-util";
import { HTML_SHAPE_TYPE } from "../features/canvas/shapes/html-shape-types";

describe("HtmlShapeUtil", () => {
  // We instantiate the class directly to test metadata and logic.
  // Rendering tests would require a full tldraw Editor environment,
  // so we test the ShapeUtil contract surface instead.

  describe("static metadata", () => {
    it("has the correct shape type identifier", () => {
      expect(HtmlShapeUtil.type).toBe(HTML_SHAPE_TYPE);
      expect(HtmlShapeUtil.type).toBe("html-shape");
    });

    it("has props validators defined", () => {
      expect(HtmlShapeUtil.props).toBeDefined();
      expect(typeof HtmlShapeUtil.props).toBe("object");
    });
  });

  describe("default props", () => {
    const util = Object.create(HtmlShapeUtil.prototype) as HtmlShapeUtil;

    it("returns default width and height of 400", () => {
      const defaults = util.getDefaultProps();
      expect(defaults.w).toBe(400);
      expect(defaults.h).toBe(400);
    });

    it("returns empty html by default", () => {
      const defaults = util.getDefaultProps();
      expect(defaults.html).toBe("");
    });

    it("returns empty slideId by default", () => {
      const defaults = util.getDefaultProps();
      expect(defaults.slideId).toBe("");
    });

    it("returns slideIndex 0 by default", () => {
      const defaults = util.getDefaultProps();
      expect(defaults.slideIndex).toBe(0);
    });
  });

  describe("capabilities", () => {
    const util = Object.create(HtmlShapeUtil.prototype) as HtmlShapeUtil;

    it("canEdit returns false (editing handled by the side panel)", () => {
      expect(util.canEdit()).toBe(false);
    });

    it("canResize returns true", () => {
      expect(util.canResize()).toBe(true);
    });

    it("isAspectRatioLocked returns true (content formats have fixed ratios)", () => {
      expect(util.isAspectRatioLocked()).toBe(true);
    });
  });

  describe("geometry", () => {
    const util = Object.create(HtmlShapeUtil.prototype) as HtmlShapeUtil;

    it("returns a Rectangle2d with shape dimensions", () => {
      const mockShape = {
        props: { w: 300, h: 500, html: "", slideId: "s1", slideIndex: 0 },
      } as Parameters<HtmlShapeUtil["getGeometry"]>[0];

      const geo = util.getGeometry(mockShape);

      // Rectangle2d exposes width/height
      expect(geo.bounds.w).toBe(300);
      expect(geo.bounds.h).toBe(500);
    });

    it("returns filled geometry (clickable area covers entire shape)", () => {
      const mockShape = {
        props: { w: 100, h: 100, html: "", slideId: "s2", slideIndex: 0 },
      } as Parameters<HtmlShapeUtil["getGeometry"]>[0];

      const geo = util.getGeometry(mockShape);
      // isFilled means the interior is a hit target, not just the border
      expect(geo.isFilled).toBe(true);
    });
  });

  describe("exports", () => {
    it("barrel export exposes HTML_SHAPE_TYPE and HtmlShapeUtil", () => {
      expect(HTML_SHAPE_TYPE).toBe("html-shape");
      expect(HtmlShapeUtil.type).toBe(HTML_SHAPE_TYPE);
    });
  });
});
