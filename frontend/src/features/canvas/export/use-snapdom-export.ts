import { snapdom } from "@zumer/snapdom";
import { renderHtmlIntoShadowHost } from "../shapes/html-render-utils";

export type ExportFormat = "png" | "jpeg" | "webp" | "svg";

interface ExportOptions {
  html: string;
  width: number;
  height: number;
  format?: ExportFormat;
  quality?: number;
  globalStyles?: string;
}

export async function exportSlideToBlob({
  html,
  width,
  height,
  format = "png",
  quality = 0.92,
  globalStyles,
}: ExportOptions): Promise<Blob> {
  const container = document.createElement("div");
  container.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    `width: ${width}px`,
    `height: ${height}px`,
    "pointer-events: none",
    "opacity: 1",
    "background: white",
    "overflow: hidden",
  ].join(";");

  const host = document.createElement("div");
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.dataset.exportTarget = "offscreen-html-shape";
  container.appendChild(host);
  document.body.appendChild(container);

  try {
    renderHtmlIntoShadowHost(
      host,
      html,
      width,
      height,
      width,
      height,
      globalStyles,
    );
    await new Promise((resolve) => globalThis.setTimeout(resolve, 120));

    return await snapdom.toBlob(host, {
      type: format,
      quality,
      backgroundColor: "#ffffff",
      scale: 1,
      embedFonts: true,
      outerTransforms: false,
    });
  } finally {
    container.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
