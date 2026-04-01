import { useMemo, useState } from "react";

type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban,
  Plus,
  Loader2,
  Search,
  LayoutGrid,
  LayoutList,
  Folder,
  Tag,
  Pencil,
  Trash2,
} from "lucide-react";
import { DynamicIcon } from "./tag-icon-picker";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../auth/use-auth";
import { fetchProjects, getProjectIconUrl } from "./api";
import { ProjectCard } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectEditModal } from "./project-edit-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import { Breadcrumb } from "./breadcrumb";
import type { Project } from "./types";

export function ProjectsListPage() {
  const { isOwner, isEditor } = useAuth();
  const canCreate = isOwner || isEditor;
  const canEdit = isOwner || isEditor;
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      const v = localStorage.getItem("projects-view");
      if (v === "grid" || v === "list") return v;
    } catch {
      /* ignore */
    }
    return "grid";
  });

  function switchView(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      localStorage.setItem("projects-view", mode);
    } catch {
      /* ignore */
    }
  }

  const {
    data: projects,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const allTags = useMemo(() => {
    const names = new Set<string>();
    for (const p of projects ?? []) {
      for (const t of p.tags) names.add(t.name);
    }
    return Array.from(names).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects ?? []).filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchTag = !activeTag || p.tags.some((t) => t.name === activeTag);
      return matchSearch && matchTag;
    });
  }, [projects, search, activeTag]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortKey) {
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "date-desc":
        return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      case "date-asc":
        return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
  }, [filtered, sortKey]);

  const hasProjects = (projects?.length ?? 0) > 0;
  const isFiltering = search.trim() !== "" || activeTag !== null;

  return (
    <div className="space-y-6 animate-page-in">
      <Breadcrumb crumbs={[{ label: "Proyectos" }]} />
      <div className="paper-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FolderKanban size={20} />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Organize your design banks and contenido by project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasProjects && (
            <div className="flex items-center rounded-[14px] border border-border bg-card p-1">
              <button
                onClick={() => switchView("grid")}
                className={cn(
                  "rounded-[10px] p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                title="Vista cuadrícula"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => switchView("list")}
                className={cn(
                  "rounded-[10px] p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                title="Vista lista"
              >
                <LayoutList size={14} />
              </button>
            </div>
          )}
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Search + tag filters */}
      {hasProjects && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full pl-8 pr-3"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="name-asc">A → Z</option>
              <option value="name-desc">Z → A</option>
              <option value="date-desc">Más reciente</option>
              <option value="date-asc">Más antiguo</option>
            </select>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTag(null)}
                className={cn(
                  "rounded-[12px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  activeTag === null
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                Todos
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "rounded-[12px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    activeTag === tag
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading projects...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Failed to load projects. Please refresh.
        </p>
      )}

      {/* Empty state — no projects at all */}
      {!isLoading && !hasProjects && (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col items-center justify-center border-dashed py-16 text-center">
          <FolderKanban size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canCreate
              ? "Create your first project to get started."
              : "Projects will appear here once created."}
          </p>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)} className="mt-4">
              <Plus size={14} />
              New Project
            </Button>
          )}
        </div>
      )}

      {/* Empty state — filter has no results */}
      {!isLoading && hasProjects && sorted.length === 0 && (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col items-center justify-center border-dashed py-12 text-center">
          <Search size={24} className="text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Sin proyectos que coincidan con los filtros.
          </p>
          {isFiltering && (
            <button
              onClick={() => {
                setSearch("");
                setActiveTag(null);
              }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Grid view */}
      {!isLoading && sorted.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={canEdit ? setEditingProject : undefined}
              onDelete={isOwner ? setDeletingProject : undefined}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!isLoading && sorted.length > 0 && viewMode === "list" && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
          {sorted.map((project) => {
            const color = project.color || "#6366f1";
            return (
              <div
                key={project.id}
                className="relative flex items-center group"
              >
                <div
                  className="w-1 self-stretch shrink-0"
                  style={{ backgroundColor: color }}
                />
                <Link
                  to={`/projects/${project.id}`}
                  className="flex flex-1 items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors min-w-0"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md overflow-hidden"
                    style={{ backgroundColor: color + "1a" }}
                  >
                    {project.icon_url ? (
                      <img
                        src={getProjectIconUrl(project.id)}
                        alt={project.name}
                        className="h-8 w-8 object-cover"
                      />
                    ) : (
                      <Folder size={15} style={{ color }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {project.tags.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.name}
                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: tag.color + "20",
                            color: tag.color,
                          }}
                        >
                          {tag.icon ? (
                            <DynamicIcon name={tag.icon} size={9} />
                          ) : (
                            <Tag size={9} />
                          )}
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                {(canEdit || isOwner) && (
                  <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <button
                        onClick={() => setEditingProject(project)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Editar"
                        aria-label="Editar proyecto"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => setDeletingProject(project)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Eliminar"
                        aria-label="Eliminar proyecto"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateProjectDialog onClose={() => setShowCreate(false)} />
      )}

      <ProjectEditModal
        project={editingProject}
        open={editingProject !== null}
        onClose={() => setEditingProject(null)}
        onSaved={() => setEditingProject(null)}
      />

      <DeleteConfirmModal
        project={deletingProject}
        open={deletingProject !== null}
        onClose={() => setDeletingProject(null)}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          setDeletingProject(null);
        }}
      />
    </div>
  );
}
