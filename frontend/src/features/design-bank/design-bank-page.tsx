import { useMemo, useState } from "react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ImageIcon,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Folder,
  FolderOpen,
  ChevronRight,
  ExternalLink,
  Palette,
  Type,
  AlignLeft,
  Code,
  Paintbrush,
  Braces,
  FileCode,
  File,
  LayoutList,
  LayoutGrid,
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../auth/use-auth";
import { fetchSources, getSourceFileUrl, deleteSource } from "./api";
import { SourceDetailModal } from "./source-detail-modal";
import { AddResourceModal } from "./add-resource-modal";
import { FolderCard } from "./folder-card";
import { fetchProjects, getProjectIconUrl } from "../projects/api";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DesignBankSource } from "./types";
import type { Project } from "../projects/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TypeFilter =
  | "all"
  | "image"
  | "color"
  | "font"
  | "text"
  | "pdf"
  | "url"
  | "code";
type ViewMode = "folders" | "list";
type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

const TYPE_FILTER_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "color", label: "Colors" },
  { key: "font", label: "Fonts" },
  { key: "text", label: "Text" },
  { key: "pdf", label: "PDFs" },
  { key: "url", label: "URLs" },
  { key: "code", label: "Code" },
];

const IMAGE_TYPES = [
  "image",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "logo",
];
const CODE_TYPES = [
  "html",
  "css",
  "js",
  "javascript",
  "markdown",
  "design_system",
];

function matchesTypeFilter(
  source: DesignBankSource,
  filter: TypeFilter,
): boolean {
  if (filter === "all") return true;
  const t = source.source_type.toLowerCase();
  if (filter === "image") return IMAGE_TYPES.includes(t);
  if (filter === "color") return t === "color";
  if (filter === "font") return t === "font";
  if (filter === "text") return t === "text";
  if (filter === "pdf") return t === "pdf";
  if (filter === "url") return t === "url";
  if (filter === "code") return CODE_TYPES.includes(t);
  return true;
}

function matchesSearch(source: DesignBankSource, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const label = (
    source.name ||
    source.original_filename ||
    source.url ||
    ""
  ).toLowerCase();
  return label.includes(q);
}

function getStoredView(key: string, fallback: ViewMode): ViewMode {
  try {
    const v = localStorage.getItem(key);
    if (v === "folders" || v === "list") return v;
  } catch {
    // ignore
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourceTypeIcon({
  sourceType,
  size = 16,
}: {
  sourceType: string;
  size?: number;
}) {
  const t = sourceType.toLowerCase();
  if (IMAGE_TYPES.includes(t))
    return <ImageIcon size={size} className="text-zinc-500" />;
  if (t === "pdf") return <FileText size={size} className="text-red-500" />;
  if (t === "color") return <Palette size={size} className="text-zinc-500" />;
  if (t === "font") return <Type size={size} className="text-zinc-500" />;
  if (t === "text") return <AlignLeft size={size} className="text-zinc-500" />;
  if (t === "html") return <Code size={size} className="text-zinc-500" />;
  if (["css", "design_system"].includes(t))
    return <Paintbrush size={size} className="text-zinc-500" />;
  if (["js", "javascript"].includes(t))
    return <Braces size={size} className="text-zinc-500" />;
  if (t === "markdown")
    return <FileCode size={size} className="text-zinc-500" />;
  if (t === "url") return <Globe size={size} className="text-zinc-500" />;
  return <File size={size} className="text-zinc-500" />;
}

function sourceStatusProps(status: string) {
  switch (status) {
    case "ready":
      return {
        label: "ready",
        variant: "success" as const,
        icon: <CheckCircle size={11} />,
      };
    case "processing":
      return {
        label: "processing",
        variant: "warning" as const,
        icon: <Loader2 size={11} className="animate-spin" />,
      };
    case "failed":
      return {
        label: "failed",
        variant: "danger" as const,
        icon: <XCircle size={11} />,
      };
    default:
      return { label: "pending", variant: "neutral" as const, icon: undefined };
  }
}

function SourceStatusBadge({ status }: { status: string }) {
  const { label, variant, icon } = sourceStatusProps(status);
  return (
    <Badge variant={variant} className="rounded-full px-2 py-0.5 gap-1">
      {icon} {label}
    </Badge>
  );
}

function SourceCard({
  source,
  onClick,
  onDelete,
}: {
  source: DesignBankSource;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const label =
    source.name ||
    source.original_filename ||
    source.url ||
    `Source #${source.id}`;
  const t = source.source_type.toLowerCase();
  const rd = (source.resource_data ?? {}) as Record<string, string>;
  const isImage = IMAGE_TYPES.includes(t);
  const showThumbnail =
    isImage && source.status === "ready" && source.storage_key;
  const snippet =
    t === "color"
      ? rd.hex || ""
      : t === "font"
        ? rd.family || ""
        : t === "text"
          ? (rd.content || "").slice(0, 80)
          : "";

  return (
    <div
      data-testid="design-bank-source-card"
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/25 p-4 text-zinc-100",
        onClick && "cursor-pointer transition-colors hover:bg-white/[0.03]",
      )}
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-300"
          title="Delete"
          aria-label="Delete resource"
        >
          <Trash2 size={12} />
        </button>
      )}
      {showThumbnail ? (
        <img
          src={getSourceFileUrl(source.id)}
          alt={label}
          className="h-14 w-14 shrink-0 rounded-lg border border-zinc-800/70 object-cover"
        />
      ) : t === "color" && rd.hex ? (
        <div
          className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-zinc-800/70"
          style={{ background: rd.hex }}
        />
      ) : (
        <div className="mt-0.5 shrink-0">
          <SourceTypeIcon sourceType={source.source_type} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100" title={label}>
          {label}
        </p>
        {snippet && (
          <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
            {snippet}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span data-testid="design-bank-source-status">
            <SourceStatusBadge status={source.status} />
          </span>
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {source.source_type}
          </span>
        </div>
        {source.status === "failed" && source.error_message && (
          <p className="mt-1 text-xs text-destructive">
            {source.error_message}
          </p>
        )}
      </div>
    </div>
  );
}

function SourceRow({
  source,
  onClick,
  onDelete,
}: {
  source: DesignBankSource;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const label =
    source.name ||
    source.original_filename ||
    source.url ||
    `Source #${source.id}`;
  const t = source.source_type.toLowerCase();
  const rd = (source.resource_data ?? {}) as Record<string, string>;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 transition-colors",
        onClick
          ? "cursor-pointer hover:bg-white/[0.03]"
          : "hover:bg-white/[0.02]",
      )}
    >
      <div className="shrink-0">
        <SourceTypeIcon sourceType={source.source_type} />
      </div>
      {t === "color" && rd.hex && (
        <span
          className="inline-block h-4 w-4 shrink-0 rounded-full border border-zinc-800/70"
          style={{ background: rd.hex }}
        />
      )}
      <p className="flex-1 truncate text-sm text-zinc-100">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        <span data-testid="design-bank-source-status">
          <SourceStatusBadge status={source.status} />
        </span>
        <span className="hidden text-xs uppercase tracking-wide text-zinc-500 sm:inline">
          {source.source_type}
        </span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 rounded-lg text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-300"
            title="Delete"
            aria-label="Delete resource"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function ProjectFolder({
  project,
  sources,
  open,
  onToggle,
  onSourceClick,
  onSourceDelete,
}: {
  project: Project;
  sources: DesignBankSource[];
  open: boolean;
  onToggle: () => void;
  onSourceClick?: (source: DesignBankSource) => void;
  onSourceDelete?: (source: DesignBankSource) => void;
}) {
  const color = project.color || "#6366f1";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left transition-colors",
          open ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
        )}
        style={{ borderLeftColor: color }}
      >
        <span className="shrink-0 h-5 w-5 flex items-center justify-center overflow-hidden rounded">
          {project.icon_url ? (
            <img
              src={getProjectIconUrl(project.id)}
              alt={project.name}
              className="h-5 w-5 object-cover"
            />
          ) : (
            <span style={{ color }}>
              {open ? <FolderOpen size={18} /> : <Folder size={18} />}
            </span>
          )}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-zinc-100">
          {project.name}
        </span>
        <span className="shrink-0 text-xs text-zinc-500">
          {sources.length} resource{sources.length !== 1 ? "s" : ""}
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-zinc-500 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-800/60 bg-zinc-950/40 p-4">
          {sources.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-400">
                No resources in this project.
              </p>
              <RouterLink
                to={`/projects/${project.id}`}
                className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-300 hover:underline"
              >
                Add from project <ExternalLink size={11} />
              </RouterLink>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sources.map((s) => (
                  <SourceCard
                    key={s.id}
                    source={s}
                    onClick={onSourceClick ? () => onSourceClick(s) : undefined}
                    onDelete={
                      onSourceDelete ? () => onSourceDelete(s) : undefined
                    }
                  />
                ))}
              </div>
              <RouterLink
                to={`/projects/${project.id}`}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-100"
              >
                View full project <ExternalLink size={11} />
              </RouterLink>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UnassignedFolder({
  sources,
  open,
  onToggle,
  onSourceClick,
  onSourceDelete,
}: {
  sources: DesignBankSource[];
  open: boolean;
  onToggle: () => void;
  onSourceClick?: (source: DesignBankSource) => void;
  onSourceDelete?: (source: DesignBankSource) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/10">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 border-l-4 border-l-zinc-800 px-4 py-3 text-left transition-colors",
          open ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
        )}
      >
        <FileText size={16} className="shrink-0 text-zinc-500" />
        <span className="flex-1 text-sm font-medium text-zinc-400">
          No project
        </span>
        <span className="shrink-0 text-xs text-zinc-500">
          {sources.length} resource{sources.length !== 1 ? "s" : ""}
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-zinc-500 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-zinc-800/60 bg-zinc-950/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((s) => (
              <SourceCard
                key={s.id}
                source={s}
                onClick={onSourceClick ? () => onSourceClick(s) : undefined}
                onDelete={onSourceDelete ? () => onSourceDelete(s) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function DesignBankPage() {
  const { isOwner, isEditor } = useAuth();
  const canUpload = isOwner || isEditor;
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeFolder = searchParams.get("folder"); // null | "unassigned" | "<projectId>"

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    getStoredView("db-global-view", "folders"),
  );
  const [selectedSource, setSelectedSource] = useState<DesignBankSource | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  // Accordion open state lifted here so it persists across view mode switches
  const [folderOpenMap, setFolderOpenMap] = useState<Record<string, boolean>>(
    {},
  );
  const [deletingSource, setDeletingSource] = useState<DesignBankSource | null>(
    null,
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSource(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["design-bank-sources"] });
      setDeletingSource(null);
    },
  });

  function toggleFolder(id: string) {
    setFolderOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem("db-global-view", mode);
    } catch {
      // ignore
    }
  }

  function enterFolder(folderId: string) {
    setSearchParams({ folder: folderId });
    setSearch("");
    setTypeFilter("all");
  }

  function exitFolder() {
    setSearchParams({});
    setSearch("");
    setTypeFilter("all");
  }

  const {
    data: sources,
    isLoading: sourcesLoading,
    isError: sourcesError,
  } = useQuery({
    queryKey: ["design-bank-sources"],
    queryFn: fetchSources,
    refetchInterval: (query) => {
      const data = query.state.data as DesignBankSource[] | undefined;
      if (!data) return false;
      const hasTransient = data.some(
        (s) => s.status === "pending" || s.status === "processing",
      );
      return hasTransient ? 3000 : false;
    },
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const isLoading = sourcesLoading || projectsLoading;

  // Group all sources by project id
  const sourcesByProject = useMemo(() => {
    const map = new Map<number | null, DesignBankSource[]>();
    if (!sources) return map;
    for (const s of sources) {
      const key = s.project_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sources]);

  // Determine the active folder's project (if any)
  const activeFolderProject = useMemo<Project | null>(() => {
    if (!activeFolder || activeFolder === "unassigned") return null;
    const id = Number(activeFolder);
    return projects.find((p) => p.id === id) ?? null;
  }, [activeFolder, projects]);

  // Sources for the active folder
  const folderSources = useMemo<DesignBankSource[]>(() => {
    if (!activeFolder) return [];
    if (activeFolder === "unassigned") return sourcesByProject.get(null) ?? [];
    const id = Number(activeFolder);
    return sourcesByProject.get(id) ?? [];
  }, [activeFolder, sourcesByProject]);

  // Filtered sources (for folder view or filtered root)
  const filteredSources = useMemo(() => {
    const pool = activeFolder != null ? folderSources : (sources ?? []);
    return pool.filter(
      (s) => matchesTypeFilter(s, typeFilter) && matchesSearch(s, search),
    );
  }, [activeFolder, folderSources, sources, typeFilter, search]);

  const isFiltering = search.trim() !== "" || typeFilter !== "all";
  const unassigned = sourcesByProject.get(null) ?? [];

  const sortedProjects = useMemo(() => {
    const list = [...projects];
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
  }, [projects, sortKey]);

  const sortedFolderSources = useMemo(() => {
    const list = [...filteredSources];
    switch (sortKey) {
      case "name-asc":
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "name-desc":
        return list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      case "date-desc":
        return list.sort((a, b) => b.id - a.id);
      case "date-asc":
        return list.sort((a, b) => a.id - b.id);
    }
  }, [filteredSources, sortKey]);

  // Active folder label for header
  const folderLabel = activeFolderProject
    ? activeFolderProject.name
    : activeFolder === "unassigned"
      ? "No project"
      : null;

  // projectId to pre-select in AddResourceModal
  const modalProjectId = useMemo(() => {
    if (!activeFolder || activeFolder === "unassigned") return null;
    return Number(activeFolder);
  }, [activeFolder]);

  return (
    <div className="animate-page-in space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {activeFolder != null ? (
            <div className="flex items-center gap-2">
              <button
                onClick={exitFolder}
                className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-100"
              >
                <ArrowLeft size={16} />
                <span>Design Bank</span>
              </button>
              <span className="text-zinc-600">/</span>
              <span className="font-semibold text-zinc-100">{folderLabel}</span>
            </div>
          ) : (
            <>
              <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-zinc-50">
                Design Bank
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Design resources organized by project.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canUpload && (
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-zinc-50 text-zinc-900 shadow-none hover:bg-white"
            >
              <Plus size={14} />
              Add resource
            </Button>
          )}
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-1">
            <button
              onClick={() => switchView("folders")}
              title="Folder view"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "folders"
                  ? "bg-zinc-50 text-zinc-900"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
              )}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => switchView("list")}
              title="List view"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "list"
                  ? "bg-zinc-50 text-zinc-900"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
              )}
            >
              <LayoutList size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Search + type filters */}
      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4 backdrop-blur-xl">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="h-11 rounded-xl border-zinc-800/70 bg-zinc-950/80 pl-10 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="flex h-11 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-white/[0.04]"
          >
            <option value="name-asc">A → Z</option>
            <option value="name-desc">Z → A</option>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTypeFilter(opt.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.08]",
                typeFilter === opt.key
                  ? "border-zinc-700 bg-zinc-50 text-zinc-900"
                  : "border-zinc-800/70 bg-zinc-950/70 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={14} className="animate-spin" />
          Loading...
        </div>
      )}

      {/* Error */}
      {sourcesError && (
        <p className="text-sm text-destructive">Failed to load resources.</p>
      )}

      {!isLoading && (
        <>
          {/* ── INSIDE A FOLDER ── */}
          {activeFolder != null && (
            <div className="space-y-3">
              {filteredSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/10 py-12 text-center">
                  <FileText size={24} className="mb-2 text-zinc-500" />
                  <p className="text-sm text-zinc-400">
                    {isFiltering
                      ? "No results for the active filters."
                      : "No resources in this folder."}
                  </p>
                </div>
              ) : viewMode === "folders" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedFolderSources.map((s) => (
                    <SourceCard
                      key={s.id}
                      source={s}
                      onClick={() => setSelectedSource(s)}
                      onDelete={
                        canUpload ? () => setDeletingSource(s) : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-800/60 divide-y divide-zinc-800/60 bg-zinc-900/20">
                  {sortedFolderSources.map((s) => (
                    <SourceRow
                      key={s.id}
                      source={s}
                      onClick={() => setSelectedSource(s)}
                      onDelete={
                        canUpload ? () => setDeletingSource(s) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ROOT WITH ACTIVE FILTER — flat results ── */}
          {activeFolder == null && isFiltering && (
            <div className="space-y-3">
              {filteredSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/10 py-12 text-center">
                  <Search size={24} className="mb-2 text-zinc-500" />
                  <p className="text-sm text-zinc-400">
                    No results for the active filters.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSources.map((s) => (
                    <SourceCard
                      key={s.id}
                      source={s}
                      onClick={() => setSelectedSource(s)}
                      onDelete={
                        canUpload ? () => setDeletingSource(s) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ROOT NO FILTER — FOLDERS MODE: folder cards grid ── */}
          {activeFolder == null && !isFiltering && viewMode === "folders" && (
            <div className="space-y-3">
              {projects.length === 0 && unassigned.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  No resources yet.
                  {canUpload
                    ? " Use the 'Add resource' button to upload one."
                    : ""}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedProjects
                    .filter(
                      (p) => (sourcesByProject.get(p.id)?.length ?? 0) > 0,
                    )
                    .map((p) => (
                      <FolderCard
                        key={p.id}
                        project={p}
                        sourceCount={sourcesByProject.get(p.id)?.length ?? 0}
                        onClick={() => enterFolder(String(p.id))}
                      />
                    ))}
                  {unassigned.length > 0 && (
                    <FolderCard
                      project={null}
                      sourceCount={unassigned.length}
                      onClick={() => enterFolder("unassigned")}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ROOT NO FILTER — LIST MODE: accordions ── */}
          {activeFolder == null && !isFiltering && viewMode === "list" && (
            <div className="space-y-3">
              {sortedProjects.map((project) => (
                <ProjectFolder
                  key={project.id}
                  project={project}
                  sources={sourcesByProject.get(project.id) ?? []}
                  open={folderOpenMap[String(project.id)] ?? false}
                  onToggle={() => toggleFolder(String(project.id))}
                  onSourceClick={setSelectedSource}
                  onSourceDelete={canUpload ? setDeletingSource : undefined}
                />
              ))}

              {unassigned.length > 0 && (
                <UnassignedFolder
                  sources={unassigned}
                  open={folderOpenMap["unassigned"] ?? false}
                  onToggle={() => toggleFolder("unassigned")}
                  onSourceClick={setSelectedSource}
                  onSourceDelete={canUpload ? setDeletingSource : undefined}
                />
              )}

              {projects.length === 0 && unassigned.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No resources yet.
                  {canUpload
                    ? " Use the 'Add resource' button to upload one."
                    : ""}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AddResourceModal
        key={modalProjectId ?? "none"}
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={() => {
          void queryClient.invalidateQueries({
            queryKey: ["design-bank-sources"],
          });
        }}
        projects={projects}
        projectId={modalProjectId}
      />

      <SourceDetailModal
        source={selectedSource}
        open={selectedSource !== null}
        onClose={() => setSelectedSource(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ["design-bank-sources"],
          });
          setSelectedSource(null);
        }}
        canDelete={canUpload}
        onDeleteRequest={() => setDeletingSource(selectedSource)}
      />

      {/* Delete confirmation modal */}
      <Dialog
        open={!!deletingSource}
        onOpenChange={(o) => {
          if (!o) setDeletingSource(null);
        }}
      >
        <DialogContent className="max-w-sm border-zinc-800/70 bg-zinc-950 text-zinc-50">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirm deletion</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <div>
                <p className="font-semibold text-zinc-50">Delete resource?</p>
                <DialogDescription className="mt-1">
                  &ldquo;
                  {deletingSource?.name ||
                    deletingSource?.original_filename ||
                    `#${deletingSource?.id}`}
                  &rdquo; will be removed permanently.
                </DialogDescription>
              </div>
            </div>
            {deleteMutation.isError && (
              <p className="text-xs text-destructive">
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Failed to delete resource"}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingSource(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  deletingSource && deleteMutation.mutate(deletingSource.id)
                }
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
