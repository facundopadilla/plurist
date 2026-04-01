import { Folder, FolderOpen } from "lucide-react";
import { getProjectIconUrl } from "../projects/api";
import type { Project } from "../projects/types";

interface FolderCardProps {
  project: Project | null;
  sourceCount: number;
  onClick: () => void;
  countUnit?: string;
}

export function FolderCard({
  project,
  sourceCount,
  onClick,
  countUnit = "recurso",
}: FolderCardProps) {
  const color = project?.color || "#6b7280";
  const accentBg = color + "1a";
  const cardBg = color + "0d";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-lg border border-border p-4 hover:border-foreground/20 transition-colors"
      style={{
        borderTopColor: color,
        borderTopWidth: 2,
        backgroundColor: cardBg,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md shrink-0 overflow-hidden"
          style={{ backgroundColor: accentBg }}
        >
          {project?.icon_url ? (
            <img
              src={getProjectIconUrl(project.id)}
              alt={project.name}
              className="h-9 w-9 object-cover"
            />
          ) : (
            <>
              <Folder
                size={18}
                className="group-hover:hidden"
                style={{ color }}
              />
              <FolderOpen
                size={18}
                className="hidden group-hover:block"
                style={{ color }}
              />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {project ? project.name : "Sin proyecto"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sourceCount} {countUnit}
            {sourceCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}
