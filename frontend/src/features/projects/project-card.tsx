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

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
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

  const projectColor = project.color || "#6366f1";
  const accentBg = projectColor + "1a";
  const cardBg = projectColor + "0d";
  const showMenu = onEdit || onDelete;

  return (
    <div className="relative">
      <div
        onClick={() => navigate(`/projects/${project.id}`)}
        className="elegant-card block border p-5 transition-colors group cursor-pointer hover:border-primary/30"
        style={{ borderTopColor: projectColor, backgroundColor: cardBg }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md shrink-0 overflow-hidden"
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
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {project.name}
            </p>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
            {project.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center gap-1 rounded-[12px] px-2.5 py-1 text-xs font-medium"
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

        {/* Sub-folders */}
        <div className="mt-4 flex gap-2 border-t border-border pt-3">
          <Link
            to={`/design-bank?folder=${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="elegant-chip hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ImageIcon size={11} />
            Design Bank
          </Link>
          <Link
            to={`/contenido?folder=${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="elegant-chip hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <FileText size={11} />
            Contenido
          </Link>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Dropdown menu — outside the Link to stop propagation */}
      {showMenu && (
        <div ref={menuRef} className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 min-w-[130px] rounded-[14px] border border-border bg-popover py-1 shadow-lg">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit(project);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Pencil size={13} />
                  Editar
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-accent transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
