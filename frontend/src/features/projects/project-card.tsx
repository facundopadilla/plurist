import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Folder,
  FolderOpen,
  Tag,
  ImageIcon,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { DynamicIcon } from "./tag-icon-picker";
import type { Project } from "./types";
import { getProjectIconUrl } from "./api";

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
}: Readonly<ProjectCardProps>) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const projectColor = project.color ?? "#6366f1";
  const accentBg = projectColor + "1a";
  const cardBg = projectColor + "0d";
  const showMenu = onEdit || onDelete;

  return (
    <div className="relative">
      <div
        className="group relative rounded-2xl border border-zinc-800/60 p-5 transition-colors hover:border-zinc-700/80"
        style={{ borderTopColor: projectColor, backgroundColor: cardBg }}
      >
        <button
          type="button"
          aria-label={`Open project ${project.name}`}
          className="absolute inset-0 rounded-2xl"
          onClick={() => navigate(`/projects/${project.id}`)}
        />
        <div className="pointer-events-none">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{ backgroundColor: accentBg }}
            >
              {project.icon_url ? (
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
                    style={{ color: projectColor }}
                  />
                  <FolderOpen
                    size={18}
                    className="hidden group-hover:block"
                    style={{ color: projectColor }}
                  />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <p className="truncate font-semibold text-zinc-100">
                {project.name}
              </p>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {project.description}
                </p>
              )}
              {project.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                      }}
                    >
                      {tag.icon ? (
                        <DynamicIcon name={tag.icon} size={10} />
                      ) : (
                        <Tag size={10} />
                      )}
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex gap-2 border-t border-zinc-800/50 pt-3">
          <Link
            to={`/design-bank?folder=${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800/70 bg-zinc-950/70 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
          >
            <ImageIcon size={11} />
            Design Bank
          </Link>
          <Link
            to={`/content?folder=${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800/70 bg-zinc-950/70 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
          >
            <FileText size={11} />
            Content
          </Link>
        </div>

        <p className="pointer-events-none mt-2 text-xs text-zinc-500">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {showMenu && (
        <div ref={menuRef} className="absolute right-3 top-3 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 min-w-[130px] rounded-xl border border-zinc-800/70 bg-zinc-950 py-1 shadow-lg">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit(project);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/[0.04]"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(project);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
