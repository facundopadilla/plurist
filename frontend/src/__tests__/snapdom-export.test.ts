import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportSlideToBlob } from "../features/canvas/export/use-snapdom-export";

vi.mock("@zumer/snapdom", () => ({
  snapdom: {
    toBlob: vi.fn(),
  },
}));

async function getSnapdomMock() {
  const module = await import("@zumer/snapdom");
  return vi.mocked(module.snapdom.toBlob);
}

describe("exportSlideToBlob", () => {
  beforeEach(() => {
    // hoisted mock: resolve it at runtime, not top-level
  });

  it("uses SnapDOM to export an offscreen HTML preview", async () => {
    const toBlob = await getSnapdomMock();
    toBlob.mockReset();
    toBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    const blob = await exportSlideToBlob({
      html: "<html><body><h1>Hello</h1></body></html>",
      width: 1080,
      height: 1080,
      format: "png",
    });

    expect(blob.type).toBe("image/png");
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[data-export-target="offscreen-html-shape"]'),
    ).toBeNull();
  });
});
