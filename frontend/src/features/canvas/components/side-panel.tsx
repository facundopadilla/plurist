import type { ReactNode } from "react";
import { useCanvasStore } from "../canvas-store";
import type { PanelId } from "../types";

interface SidePanelProps {
  children: ReactNode;
  panelId?: PanelId;
}

export function SidePanel({ children, panelId = "chat" }: SidePanelProps) {
  const chatPanelSize = useCanvasStore((s) => s.chatPanelSize);
  const width =
    panelId === "chat"
      ? chatPanelSize === "compact"
        ? 300
        : 420
      : panelId === "code"
        ? 480
        : 340;

  return (
    <aside
      className="flex flex-shrink-0 flex-col overflow-hidden border-r border-zinc-800/60 bg-zinc-950/72 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-xl transition-[width] duration-150"
      style={{ width }}
      data-testid="side-panel"
      onKeyDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onKeyUp={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      {children}
    </aside>
  );
}
