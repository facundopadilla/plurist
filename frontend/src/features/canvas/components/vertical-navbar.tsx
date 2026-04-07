import {
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Images,
  Maximize2,
  Minimize2,
  Puzzle,
  Code2,
  LibraryBig,
} from "lucide-react";
import { useCanvasStore } from "../canvas-store";
import { cn } from "../../../lib/utils";
import type { PanelId } from "../types";

interface NavTool {
  id: PanelId;
  label: string;
  icon: React.ElementType;
}

const NAV_TOOLS: NavTool[] = [
  { id: "chat", label: "Generate", icon: Sparkles },
  { id: "resources", label: "Resources", icon: Images },
  { id: "skills", label: "Skills", icon: LibraryBig },
  { id: "extensions", label: "Extensions", icon: Puzzle },
  { id: "code", label: "Code", icon: Code2 },
];

export function VerticalNavbar() {
  const activePanel = useCanvasStore((s) => s.activePanel);
  const togglePanel = useCanvasStore((s) => s.togglePanel);
  const resetActivePanel = useCanvasStore((s) => s.resetActivePanel);
  const chatPanelSize = useCanvasStore((s) => s.chatPanelSize);
  const toggleChatPanelSize = useCanvasStore((s) => s.toggleChatPanelSize);

  return (
    <nav
      className="flex flex-shrink-0 flex-col items-center gap-2 border-r border-zinc-800/60 bg-zinc-950/80 px-2 py-3 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-xl"
      style={{ width: 64 }}
      data-testid="vertical-navbar"
    >
      <div className="flex w-full flex-col gap-2">
        {NAV_TOOLS.map(({ id, label, icon: Icon }) => {
          const isActive = activePanel === id;
          return (
            <button
              key={id}
              onClick={() => togglePanel(id)}
              aria-label={label}
              title={label}
              aria-pressed={isActive}
              data-testid={`navbar-tool-${id}`}
              className={cn(
                "flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] leading-tight transition-colors",
                isActive
                  ? "bg-white/[0.08] text-zinc-50"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
              )}
            >
              <Icon size={16} />
              <span className="tracking-[0.01em]">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex w-full flex-col gap-2 border-t border-zinc-800/60 pt-2">
        <button
          onClick={() => {
            if (activePanel === null) {
              resetActivePanel();
              return;
            }
            togglePanel(activePanel);
          }}
          aria-label={
            activePanel === null ? "Open chat" : "Collapse side panel"
          }
          title={activePanel === null ? "Open chat" : "Collapse side panel"}
          data-testid="navbar-toggle-panel"
          className="flex h-10 w-full items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
        >
          {activePanel === null ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>

        <button
          onClick={() => {
            if (activePanel !== "chat") {
              resetActivePanel();
            }
            toggleChatPanelSize();
          }}
          aria-label={
            chatPanelSize === "expanded" ? "Compact chat" : "Expand chat"
          }
          title={chatPanelSize === "expanded" ? "Compact chat" : "Expand chat"}
          data-testid="navbar-toggle-chat-size"
          className="flex h-10 w-full items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
        >
          {chatPanelSize === "expanded" ? (
            <Minimize2 size={16} />
          ) : (
            <Maximize2 size={16} />
          )}
        </button>
      </div>
    </nav>
  );
}
