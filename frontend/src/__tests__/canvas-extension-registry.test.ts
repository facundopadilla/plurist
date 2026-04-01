import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import {
  registerExtension,
  unregisterExtension,
  getExtensions,
  getExtension,
  getExtensionsByCategory,
  clearExtensions,
  type CanvasExtension,
} from "../features/canvas/extensions";
import {
  aiImageStubExtension,
  AI_IMAGE_STUB_ID,
} from "../features/canvas/extensions/ai-image-stub";

/** Helper: create a minimal test extension with given id and category. */
function makeTestExtension(
  id: string,
  category: "image" | "text" | "style" | "layout" | "other" = "other",
): CanvasExtension {
  return {
    meta: {
      id,
      name: `Test ${id}`,
      description: `Test extension ${id}`,
      icon: createElement("span", null, "T"),
      category,
    },
    Panel: () => createElement("div", null, `Panel ${id}`),
  };
}

describe("canvas extension registry", () => {
  beforeEach(() => {
    clearExtensions();
  });

  describe("register / unregister", () => {
    it("registers an extension and retrieves it by ID", () => {
      const ext = makeTestExtension("test-ext");
      registerExtension(ext);

      expect(getExtension("test-ext")).toBe(ext);
      expect(getExtensions()).toHaveLength(1);
    });

    it("unregisters an extension by ID", () => {
      const ext = makeTestExtension("test-ext");
      registerExtension(ext);
      unregisterExtension("test-ext");

      expect(getExtension("test-ext")).toBeUndefined();
      expect(getExtensions()).toHaveLength(0);
    });

    it("unregister is a no-op for unknown IDs", () => {
      unregisterExtension("nonexistent");
      expect(getExtensions()).toHaveLength(0);
    });

    it("getExtensions returns a snapshot array (safe to iterate)", () => {
      registerExtension(makeTestExtension("a"));
      registerExtension(makeTestExtension("b"));

      const all = getExtensions();
      expect(all).toHaveLength(2);
      expect(all.map((e) => e.meta.id)).toEqual(["a", "b"]);
    });

    it("clearExtensions removes all registered extensions", () => {
      registerExtension(makeTestExtension("a"));
      registerExtension(makeTestExtension("b"));
      clearExtensions();

      expect(getExtensions()).toHaveLength(0);
    });
  });

  describe("duplicate-ID guard", () => {
    it("throws when registering an extension with a duplicate ID", () => {
      registerExtension(makeTestExtension("dup"));

      expect(() => registerExtension(makeTestExtension("dup"))).toThrowError(
        /Duplicate extension ID.*"dup"/,
      );
    });

    it("allows re-registering after unregister", () => {
      const ext = makeTestExtension("reuse");
      registerExtension(ext);
      unregisterExtension("reuse");

      // Should not throw
      const ext2 = makeTestExtension("reuse");
      registerExtension(ext2);
      expect(getExtension("reuse")).toBe(ext2);
    });
  });

  describe("category filtering", () => {
    it("getExtensionsByCategory returns only matching extensions", () => {
      registerExtension(makeTestExtension("img-1", "image"));
      registerExtension(makeTestExtension("txt-1", "text"));
      registerExtension(makeTestExtension("img-2", "image"));

      const images = getExtensionsByCategory("image");
      expect(images).toHaveLength(2);
      expect(images.map((e) => e.meta.id)).toEqual(["img-1", "img-2"]);

      const text = getExtensionsByCategory("text");
      expect(text).toHaveLength(1);
      expect(text[0].meta.id).toBe("txt-1");
    });

    it("returns empty array for categories with no extensions", () => {
      registerExtension(makeTestExtension("a", "image"));
      expect(getExtensionsByCategory("style")).toEqual([]);
    });
  });

  describe("ai-image-stub extension", () => {
    it("exports correct extension ID constant", () => {
      expect(AI_IMAGE_STUB_ID).toBe("ai-image-stub");
    });

    it("has valid metadata", () => {
      expect(aiImageStubExtension.meta.id).toBe("ai-image-stub");
      expect(aiImageStubExtension.meta.name).toBe("AI Image (Stub)");
      expect(aiImageStubExtension.meta.category).toBe("image");
      expect(typeof aiImageStubExtension.Panel).toBe("function");
    });

    it("can be registered and appears in the registry", () => {
      registerExtension(aiImageStubExtension);

      expect(getExtension("ai-image-stub")).toBe(aiImageStubExtension);
      expect(getExtensionsByCategory("image")).toHaveLength(1);
    });

    it("duplicate registration throws", () => {
      registerExtension(aiImageStubExtension);

      expect(() => registerExtension(aiImageStubExtension)).toThrowError(
        /Duplicate extension ID.*"ai-image-stub"/,
      );
    });
  });
});
