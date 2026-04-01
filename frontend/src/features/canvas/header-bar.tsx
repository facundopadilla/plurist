import { Link } from "react-router-dom";
import { ArrowLeft, Download, Send } from "lucide-react";
import { useCanvasStore } from "./canvas-store";
import { cn } from "../../lib/utils";

interface HeaderBarProps {
  onExport?: () => void;
  onSubmit?: () => void;
}

export function HeaderBar({ onExport, onSubmit }: HeaderBarProps) {
  const config = useCanvasStore((s) => s.config);
  const setConfig = useCanvasStore((s) => s.setConfig);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);
  const draftPostId = useCanvasStore((s) => s.draftPostId);
  const isStreaming = useCanvasStore((s) => s.isStreaming);

  function saveLabel() {
    if (isDirty) return "Cambios sin guardar";
    if (lastSavedAt) return `Guardado`;
    return "";
  }

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card flex-shrink-0">
      {/* Back */}
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Inicio</span>
      </Link>

      <div className="w-px h-5 bg-border flex-shrink-0" />

      {/* Title */}
      <span className="text-sm font-semibold text-foreground flex-shrink-0">
        Canvas Studio
      </span>

      {/* Title input */}
      <input
        type="text"
        value={config.title}
        onChange={(e) => setConfig({ title: e.target.value })}
        placeholder="Sin título..."
        aria-label="Título del canvas"
        className="flex-1 min-w-0 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
      />

      {/* Save status */}
      {saveLabel() && (
        <span
          className={cn(
            "text-xs flex-shrink-0",
            isDirty ? "text-amber-500" : "text-muted-foreground",
          )}
        >
          {saveLabel()}
        </span>
      )}

      {/* Export */}
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <Download size={14} />
          <span>Exportar</span>
        </button>
      )}

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!draftPostId || isDirty || isStreaming}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Send size={14} />
        <span>Enviar a aprobación</span>
      </button>
    </header>
  );
}
