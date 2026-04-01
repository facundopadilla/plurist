import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { downloadHtmlShapeBundle } from "../features/canvas/export/export-zip";

const { downloadBlob } = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
}));

vi.mock("../features/canvas/export/use-snapdom-export", () => ({
  downloadBlob,
}));

describe("downloadHtmlShapeBundle", () => {
  it("creates a zip bundle with html, previews and metadata", async () => {
    const bundle = await downloadHtmlShapeBundle({
      slideId: "slide-1",
      html: "<html><body><h1>Hello</h1></body></html>",
      name: "Hero Banner",
      isFavorite: true,
      formatWidth: 1080,
      formatHeight: 1080,
      assets: [
        {
          filename: "preview.png",
          blob: new Blob(["png"], { type: "image/png" }),
        },
        {
          filename: "preview.jpg",
          blob: new Blob(["jpg"], { type: "image/jpeg" }),
        },
        {
          filename: "preview.svg",
          blob: new Blob(["svg"], { type: "image/svg+xml" }),
        },
      ],
    });

    expect(downloadBlob).toHaveBeenCalledWith(bundle, "slide-1-bundle.zip");

    const zip = await JSZip.loadAsync(bundle);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        "index.html",
        "assets/",
        "assets/preview.png",
        "assets/preview.jpg",
        "assets/preview.svg",
        "metadata.json",
      ]),
    );

    const html = await zip.file("index.html")?.async("string");
    expect(html).toContain("<h1>Hello</h1>");

    const metadataRaw = await zip.file("metadata.json")?.async("string");
    const metadata = JSON.parse(metadataRaw ?? "{}");
    expect(metadata).toMatchObject({
      slideId: "slide-1",
      name: "Hero Banner",
      isFavorite: true,
      formatWidth: 1080,
      formatHeight: 1080,
    });
    expect(metadata.availableFormats).toEqual(
      expect.arrayContaining(["png", "jpg", "svg"]),
    );
  });
});
