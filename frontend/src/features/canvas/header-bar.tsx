import { Link } from "react-router-dom";
import { ArrowLeft, Download, Send } from "lucide-react";
import { useCanvasStore } from "./canvas-store";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";

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
    if (isDirty) return "Unsaved changes";
    if (lastSavedAt) return "Saved";
    return "";
  }

  return (
    <header className="relative z-10 flex h-14 flex-shrink-0 items-center gap-2 border-b border-zinc-800/60 bg-zinc-950/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <Link
        to="/"
        className="flex flex-shrink-0 items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-50"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Home</span>
      </Link>

      <div className="h-5 w-px flex-shrink-0 bg-zinc-800/70" />

      <span className="hidden flex-shrink-0 text-sm font-semibold tracking-[-0.02em] text-zinc-50 md:inline">
        Canvas Studio
      </span>

      <input
        type="text"
        value={config.title}
        onChange={(e) => setConfig({ title: e.target.value })}
        onKeyDown={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        onKeyUp={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        placeholder="Untitled..."
        aria-label="Canvas title"
        className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-800/70 bg-zinc-950/70 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-2 focus:ring-white/[0.04]"
      />

      {saveLabel() && (
        <span
          className={cn(
            "hidden flex-shrink-0 text-[11px] md:inline",
            isDirty ? "text-amber-300" : "text-zinc-500",
          )}
        >
          {saveLabel()}
        </span>
      )}

      {onExport && (
        <Button
          onClick={onExport}
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-lg border-zinc-800/70 bg-transparent text-zinc-200 shadow-none hover:bg-white/[0.04] hover:text-zinc-50"
        >
          <Download size={14} />
          <span className="hidden lg:inline">Export</span>
        </Button>
      )}

      <Button
        onClick={onSubmit}
        disabled={!draftPostId || isDirty || isStreaming}
        size="sm"
        className="h-9 gap-1.5 rounded-lg bg-zinc-50 text-zinc-900 shadow-none hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        <Send size={14} />
        <span className="hidden xl:inline">Submit for approval</span>
      </Button>
    </header>
  );
}
