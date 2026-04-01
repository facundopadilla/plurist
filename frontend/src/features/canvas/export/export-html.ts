import { downloadBlob } from "./use-snapdom-export";

export function createHtmlExportBlob(html: string) {
  return new Blob([html], { type: "text/html;charset=utf-8" });
}

export function downloadHtmlExport(html: string, filename: string) {
  const blob = createHtmlExportBlob(html);
  downloadBlob(blob, filename);
  return blob;
}
