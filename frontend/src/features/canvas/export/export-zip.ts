import JSZip from "jszip";
import { createHtmlExportBlob } from "./export-html";
import { downloadBlob } from "./use-snapdom-export";

interface BundleAsset {
  filename: string;
  blob: Blob;
}

interface DownloadBundleOptions {
  slideId: string;
  html: string;
  name?: string;
  isFavorite?: boolean;
  formatWidth: number;
  formatHeight: number;
  assets: BundleAsset[];
}

export async function downloadHtmlShapeBundle({
  slideId,
  html,
  name,
  isFavorite,
  formatWidth,
  formatHeight,
  assets,
}: DownloadBundleOptions) {
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets");

  if (!assetsFolder) {
    throw new Error("Could not create assets folder for export bundle");
  }

  zip.file("index.html", createHtmlExportBlob(html));

  for (const asset of assets) {
    assetsFolder.file(asset.filename, asset.blob);
  }

  const metadata = {
    slideId,
    name: name ?? slideId,
    isFavorite: isFavorite ?? false,
    formatWidth,
    formatHeight,
    exportedAt: new Date().toISOString(),
    availableFormats: assets.map((asset) => asset.filename.split(".").pop()),
  };

  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  const bundle = await zip.generateAsync({ type: "blob" });
  downloadBlob(bundle, `${slideId}-bundle.zip`);
  return bundle;
}
