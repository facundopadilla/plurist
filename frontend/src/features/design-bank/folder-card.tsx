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
  countUnit = "resource",
}: Readonly<FolderCardProps>) {
  const color = project?.color ?? "#6b7280";
  const accentBg = color + "1a";
  const cardBg = color + "0d";

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl border border-zinc-800/60 p-4 text-left transition-colors hover:border-zinc-700/80"
      style={{
        borderTopColor: color,
        borderTopWidth: 2,
        backgroundColor: cardBg,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
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
          <p className="truncate font-semibold text-zinc-100 transition-colors group-hover:text-zinc-50">
            {project ? project.name : "No project"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {sourceCount} {countUnit}
            {sourceCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </button>
  );
}
