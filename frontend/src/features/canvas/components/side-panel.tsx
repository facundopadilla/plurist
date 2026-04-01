import type { ReactNode } from "react";

interface SidePanelProps {
  children: ReactNode;
}

export function SidePanel({ children }: SidePanelProps) {
  return (
    <aside
      className="w-80 flex flex-col border-r border-border bg-background flex-shrink-0 overflow-hidden"
      data-testid="side-panel"
    >
      {children}
    </aside>
  );
}
