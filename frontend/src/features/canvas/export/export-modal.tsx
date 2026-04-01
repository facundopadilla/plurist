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

        setProgress(`Exportando slide ${i + 1} de ${slideEntries.length}...`);

        const blob = await exportSlideToBlob({
          html: activeVariant.html,
          width: config.formatWidth,
          height: config.formatHeight,
          format,
          quality,
        });

        const ext = format === "jpeg" ? "jpg" : format;
        const filename =
          slideEntries.length === 1
            ? `slide.${ext}`
            : `slide-${data.slideIndex + 1}.${ext}`;

        downloadBlob(blob, filename);
      }

      setProgress("Exportacion completa.");
      setTimeout(onClose, 1000);
    } catch (err) {
      setProgress(
        `Error: ${err instanceof Error ? err.message : "Error desconocido"}`,
      );
    } finally {
      setIsExporting(false);
    }
  }, [slideEntries, config, format, quality, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-80 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            Exportar slides
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Slide count */}
        <p className="text-xs text-muted-foreground mb-4">
          {slideEntries.length} slide{slideEntries.length !== 1 ? "s" : ""} —{" "}
          {config.formatWidth}x{config.formatHeight}px
        </p>

        {/* Format */}
        <div className="mb-4">
          <label className="text-xs font-medium text-foreground block mb-1.5">
            Formato
          </label>
          <div className="flex gap-2">
            {(["png", "jpeg", "webp"] as ExportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                  format === f
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Quality (for jpeg) */}
        {format === "jpeg" && (
          <div className="mb-4">
            <label className="text-xs font-medium text-foreground block mb-1.5">
              Calidad: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Progress */}
        {progress && (
          <p className="text-xs text-muted-foreground mb-3">{progress}</p>
        )}

        {/* Actions */}
        <Button
          onClick={handleExport}
          disabled={isExporting || slideEntries.length === 0}
          className="w-full justify-center gap-2"
        >
          <Download size={15} />
          {isExporting ? "Exportando..." : "Descargar"}
        </Button>
      </div>
    </div>
  );
}
