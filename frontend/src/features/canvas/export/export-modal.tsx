import { useState, useCallback } from "react";
import { Download, X } from "lucide-react";
import { useCanvasStore } from "../canvas-store";
import { Button } from "@/components/ui/button";
import {
  exportSlideToBlob,
  downloadBlob,
  type ExportFormat,
} from "./use-snapdom-export";

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const slides = useCanvasStore((s) => s.slides);
  const config = useCanvasStore((s) => s.config);
  const globalStyles = useCanvasStore((s) => s.globalStyles);

  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const slideEntries = Array.from(slides.entries()).sort(
    ([, a], [, b]) => a.slideIndex - b.slideIndex,
  );

  const handleExport = useCallback(async () => {
    if (slideEntries.length === 0) return;
    setIsExporting(true);

    try {
      for (let i = 0; i < slideEntries.length; i++) {
        const [, data] = slideEntries[i];
        const activeVariant = data.variants.find(
          (v) => v.id === data.activeVariantId,
        );
        if (!activeVariant) continue;

        setProgress(`Exporting slide ${i + 1} of ${slideEntries.length}...`);

        const blob = await exportSlideToBlob({
          html: activeVariant.html,
          width: config.formatWidth,
          height: config.formatHeight,
          format,
          quality,
          globalStyles,
        });

        const ext = format === "jpeg" ? "jpg" : format;
        const filename =
          slideEntries.length === 1
            ? `slide.${ext}`
            : `slide-${data.slideIndex + 1}.${ext}`;

        downloadBlob(blob, filename);
      }

      setProgress("Export complete.");
      setTimeout(onClose, 1000);
    } catch (err) {
      setProgress(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsExporting(false);
    }
  }, [slideEntries, config, format, quality, onClose, globalStyles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-80 rounded-xl border border-zinc-800/70 bg-zinc-950/95 p-5 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-zinc-50">
            Export slides
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100"
          >
            <X size={16} />
          </Button>
        </div>

        <p className="mb-4 text-xs text-zinc-400">
          {slideEntries.length} slide{slideEntries.length !== 1 ? "s" : ""} -{" "}
          {config.formatWidth}x{config.formatHeight}px
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-zinc-200">
            Format
          </label>
          <div className="flex gap-2">
            {(["png", "jpeg", "webp"] as ExportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={
                  format === f
                    ? "flex-1 rounded-lg border border-zinc-700 bg-zinc-50 py-1.5 text-xs font-medium text-zinc-900 transition-colors"
                    : "flex-1 rounded-lg border border-zinc-800/70 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
                }
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {format === "jpeg" && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-zinc-200">
              Quality: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full accent-zinc-200"
            />
          </div>
        )}

        {progress && <p className="mb-3 text-xs text-zinc-400">{progress}</p>}

        <Button
          onClick={handleExport}
          disabled={isExporting || slideEntries.length === 0}
          className="w-full justify-center gap-2 rounded-lg bg-zinc-50 text-zinc-900 shadow-none hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          <Download size={15} />
          {isExporting ? "Exporting..." : "Download"}
        </Button>
      </div>
    </div>
  );
}
