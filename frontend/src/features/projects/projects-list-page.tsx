import { useMemo, useState } from "react";
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
import { useAuth } from "../auth/use-auth";
import { fetchProjects, getProjectIconUrl } from "./api";
import { ProjectCard } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectEditModal } from "./project-edit-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import { Breadcrumb } from "./breadcrumb";
import type { Project } from "./types";

type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

const inputClassName =
  "h-11 w-full rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-2 focus:ring-white/[0.04]";

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
    <div className="animate-page-in space-y-6">
      <Breadcrumb crumbs={[{ label: "Projects" }]} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[32px] font-semibold tracking-[-0.04em] text-zinc-50">
            <FolderKanban size={22} />
            Projects
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Organize your design references and content by workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasProjects && (
            <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-1">
              <button
                onClick={() => switchView("grid")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.08]",
                  viewMode === "grid"
                    ? "bg-zinc-50 text-zinc-900"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => switchView("list")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.08]",
                  viewMode === "list"
                    ? "bg-zinc-50 text-zinc-900"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
                title="List view"
              >
                <LayoutList size={14} />
              </button>
            </div>
          )}
          {canCreate && (
            <Button
              onClick={() => setShowCreate(true)}
              className="rounded-xl bg-zinc-50 text-zinc-900 shadow-none hover:bg-white"
            >
              <Plus size={14} />
              New project
            </Button>
          )}
        </div>
      </div>

      {hasProjects && (
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4 backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className={`${inputClassName} pl-10 pr-3`}
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className={inputClassName}
            >
              <option value="name-asc">A to Z</option>
              <option value="name-desc">Z to A</option>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.08]",
                  activeTag === null
                    ? "border-zinc-700 bg-zinc-50 text-zinc-900"
                    : "border-zinc-800/70 bg-zinc-950/70 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
              >
                All tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.08]",
                    activeTag === tag
                      ? "border-zinc-700 bg-zinc-50 text-zinc-900"
                      : "border-zinc-800/70 bg-zinc-950/70 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
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
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={14} className="animate-spin" />
          Loading projects...
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-300">
          Failed to load projects. Please refresh.
        </p>
      )}

      {!isLoading && !hasProjects && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/20 py-16 text-center">
          <FolderKanban size={32} className="mb-3 text-zinc-500" />
          <p className="text-sm font-medium text-zinc-100">No projects yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            {canCreate
              ? "Create your first project to get started."
              : "Projects will appear here once created."}
          </p>
          {canCreate && (
            <Button
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-xl bg-zinc-50 text-zinc-900 shadow-none hover:bg-white"
            >
              <Plus size={14} />
              New project
            </Button>
          )}
        </div>
      )}

      {!isLoading && hasProjects && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/20 py-12 text-center">
          <Search size={24} className="mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-400">
            No projects match the current filters.
          </p>
          {isFiltering && (
            <button
              onClick={() => {
                setSearch("");
                setActiveTag(null);
              }}
              className="mt-2 text-xs text-zinc-300 underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

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

      {!isLoading && sorted.length > 0 && viewMode === "list" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/25">
          {sorted.map((project, index) => {
            const color = project.color || "#6366f1";
            return (
              <div
                key={project.id}
                className={cn(
                  "group relative flex items-center",
                  index !== sorted.length - 1 && "border-b border-zinc-800/50",
                )}
              >
                <div
                  className="w-1 self-stretch shrink-0"
                  style={{ backgroundColor: color }}
                />
                <Link
                  to={`/projects/${project.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
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
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="truncate text-xs text-zinc-500">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {project.tags.length > 0 && (
                    <div className="hidden shrink-0 items-center gap-1 sm:flex">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.name}
                          className="inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-medium"
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
                  <div className="flex items-center gap-1 pr-3 opacity-0 transition-opacity group-hover:opacity-100">
                    {canEdit && (
                      <button
                        onClick={() => setEditingProject(project)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
                        title="Edit"
                        aria-label="Edit project"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => setDeletingProject(project)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        title="Delete"
                        aria-label="Delete project"
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
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          setEditingProject(null);
        }}
      />
      <DeleteConfirmModal
        project={deletingProject}
        open={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          setDeletingProject(null);
        }}
      />
    </div>
  );
}
