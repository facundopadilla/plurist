import { useEffect, useRef, type ReactNode } from "react";
import { useCanvasStore } from "../canvas-store";
import type { PanelId } from "../types";

interface SidePanelProps {
  children: ReactNode;
  panelId?: PanelId;
}

export function SidePanel({
  children,
  panelId = "chat",
}: Readonly<SidePanelProps>) {
  const chatPanelSize = useCanvasStore((s) => s.chatPanelSize);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const stopKeyPropagation = (event: KeyboardEvent) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    panel.addEventListener("keydown", stopKeyPropagation);
    panel.addEventListener("keyup", stopKeyPropagation);
    return () => {
      panel.removeEventListener("keydown", stopKeyPropagation);
      panel.removeEventListener("keyup", stopKeyPropagation);
    };
  }, []);

  let width = 340;
  if (panelId === "chat") {
    width = chatPanelSize === "compact" ? 300 : 420;
  } else if (panelId === "code") {
    width = 480;
  }

  return (
    <aside
      ref={panelRef}
      className="flex flex-shrink-0 flex-col overflow-hidden border-r border-zinc-800/60 bg-zinc-950/72 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-xl transition-[width] duration-150"
      style={{ width }}
      data-testid="side-panel"
    >
      {children}
    </aside>
  );
}
