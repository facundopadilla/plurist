import { Sparkles, Images, Puzzle } from "lucide-react";
import { useCanvasStore } from "../canvas-store";
import { cn } from "../../../lib/utils";
import type { PanelId } from "../types";

interface NavTool {
  id: PanelId;
  label: string;
  icon: React.ElementType;
}

const NAV_TOOLS: NavTool[] = [
  { id: "chat", label: "Generar", icon: Sparkles },
  { id: "resources", label: "Recursos", icon: Images },
  { id: "extensions", label: "Extensiones", icon: Puzzle },
];

export function VerticalNavbar() {
  const activePanel = useCanvasStore((s) => s.activePanel);
  const togglePanel = useCanvasStore((s) => s.togglePanel);

  return (
    <nav
      className="flex flex-col items-center gap-1 py-2 border-r border-border bg-background flex-shrink-0"
      style={{ width: 48 }}
      data-testid="vertical-navbar"
    >
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
              "flex flex-col items-center justify-center w-10 h-10 rounded-md gap-0.5 transition-colors text-[10px] leading-tight",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
