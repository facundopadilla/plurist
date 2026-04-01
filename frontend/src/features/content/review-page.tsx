import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Clock,
  AlertCircle,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  Search,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../auth/use-auth";
import {
  fetchContent,
  approveContent,
  rejectContent,
  publishContent,
} from "./api";
import { fetchProjects, getProjectIconUrl } from "../projects/api";
import { FolderCard } from "../design-bank/folder-card";
import type { DraftPost, PostStatus } from "./types";
import type { Project } from "../projects/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "folders" | "list";
type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Badge helpers
// ---------------------------------------------------------------------------

const statusIcons: Record<string, React.ReactNode> = {
  pending_approval: <Clock size={11} />,
  approved: <CheckCircle size={11} />,
  rejected: <XCircle size={11} />,
  publishing: <Loader2 size={11} className="animate-spin" />,
  published: <CheckCircle size={11} />,
  failed: <AlertCircle size={11} />,
};

function mapStatusToTone(
  status: PostStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "approved":
    case "published":
      return "success";
    case "pending_approval":
      return "warning";
    case "rejected":
    case "failed":
      return "danger";
    case "publishing":
      return "info";
    default:
      return "neutral";
  }
}

// ---------------------------------------------------------------------------
// NetworkBadges
// ---------------------------------------------------------------------------

function NetworkBadges({ networks }: { networks: string[] }) {
  return (
    <div className="flex gap-1">
      {networks.map((n) => (
        <span
          key={n}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {n}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: DraftPost }) {
  const { isOwner, isPublisher } = useAuth();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => approveContent(post.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["content"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectContent(post.id, rejectReason),
    onSuccess: () => {
      setShowRejectForm(false);
      setRejectReason("");
      void queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishContent(post.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["content"] }),
  });

  const canApprove = isOwner && post.status === "pending_approval";
  const canPublish = (isOwner || isPublisher) && post.status === "approved";

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground truncate">{post.title}</h3>
          {post.body_text && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {post.body_text}
            </p>
          )}
        </div>
        <Badge variant={mapStatusToTone(post.status)} className="gap-1">
          {statusIcons[post.status]}
          {post.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <NetworkBadges networks={post.target_networks} />
        {post.format && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {post.format}
          </span>
        )}
        {post.submitted_at && (
          <span>
            Submitted {new Date(post.submitted_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {post.failure_message && (
        <p className="text-xs text-destructive">{post.failure_message}</p>
      )}

      <div className="flex items-center gap-2">
        {canApprove && (
          <>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle size={12} />
              )}
              Approve
            </Button>
            <Button
              onClick={() => setShowRejectForm(!showRejectForm)}
              size="sm"
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle size={12} />
              Reject
            </Button>
          </>
        )}
        {canPublish && (
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            size="sm"
            className="gap-1.5"
          >
            {publishMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
            Publish Now
          </Button>
        )}
      </div>

      {showRejectForm && (
        <div className="flex gap-2">
          <Input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="flex-1"
          />
          <Button
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {rejectMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectSection (controlled accordion)
// ---------------------------------------------------------------------------

function ProjectSection({
  project,
  posts,
  open,
  onToggle,
}: {
  project: Project | null;
  posts: DraftPost[];
  open: boolean;
  onToggle: () => void;
}) {
  const label = project ? project.name : "Sin proyecto";
  const color = project?.color || "#6b7280";

  return (
    <div className="rounded-[18px] border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4",
          open ? "bg-accent/30" : "bg-card hover:bg-accent/20",
        )}
        style={{ borderLeftColor: color }}
      >
        <span className="shrink-0 h-5 w-5 flex items-center justify-center overflow-hidden rounded">
          {project?.icon_url ? (
            <img
              src={getProjectIconUrl(project.id)}
              alt={project.name}
              className="h-5 w-5 object-cover"
            />
          ) : (
            <span
              style={{ color: project ? color : undefined }}
              className={!project ? "text-muted-foreground" : ""}
            >
              {open ? <FolderOpen size={18} /> : <Folder size={18} />}
            </span>
          )}
        </span>
        <span className="font-medium text-sm text-foreground flex-1 truncate">
          {label}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {posts.length} contenido{posts.length !== 1 ? "s" : ""}
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "text-muted-foreground shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border bg-background/50 p-4 space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay contenido en esta sección.
            </p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewPage
// ---------------------------------------------------------------------------

export function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    getStoredView("review-global-view", "folders"),
  );
  const [search, setSearch] = useState("");
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");

  // Folder navigation: null = root, "unassigned" = no-project, "<id>" = project
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // Deep-link: leer ?folder=<id> al montar
  useEffect(() => {
    const f = searchParams.get("folder");
    if (f) setActiveFolder(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accordion open state lifted here so it persists across view-mode switches
  const [sectionOpenMap, setSectionOpenMap] = useState<Record<string, boolean>>(
    {},
  );

  function toggleSection(id: string) {
    setSectionOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem("review-global-view", mode);
    } catch {
      // ignore
    }
  }

  function enterFolder(folderId: string) {
    setActiveFolder(folderId);
    setSearch("");
    setActiveNetwork(null);
  }

  function exitFolder() {
    setActiveFolder(null);
    setSearch("");
    setActiveNetwork(null);
  }

  const {
    data: posts,
    isLoading: postsLoading,
    isError,
  } = useQuery({
    queryKey: ["content"],
    queryFn: fetchContent,
    refetchInterval: 5000,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const isLoading = postsLoading || projectsLoading;

  // All networks across all (non-draft) posts
  const allNetworks = useMemo(() => {
    const nets = new Set<string>();
    for (const p of posts ?? []) {
      for (const n of p.target_networks) nets.add(n);
    }
    return Array.from(nets).sort();
  }, [posts]);

  // Todos los posts (sin filtro de estado)
  const statusFiltered = useMemo(() => posts ?? [], [posts]);

  // Group status-filtered posts by project id
  const postsByProject = useMemo(() => {
    const map = new Map<number | null, DraftPost[]>();
    for (const post of statusFiltered) {
      const key = post.project_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return map;
  }, [statusFiltered]);

  // Project for the active folder
  const activeFolderProject = useMemo<Project | null>(() => {
    if (!activeFolder || activeFolder === "unassigned") return null;
    const id = Number(activeFolder);
    return projects.find((p) => p.id === id) ?? null;
  }, [activeFolder, projects]);

  // Label for the active folder breadcrumb
  const folderLabel = activeFolderProject
    ? activeFolderProject.name
    : activeFolder === "unassigned"
      ? "Sin proyecto"
      : null;

  // Posts inside the active folder (unfiltered by search/network)
  const folderPostsRaw = useMemo<DraftPost[]>(() => {
    if (!activeFolder) return [];
    if (activeFolder === "unassigned") return postsByProject.get(null) ?? [];
    const id = Number(activeFolder);
    return postsByProject.get(id) ?? [];
  }, [activeFolder, postsByProject]);

  // Apply search + network filter inside folder
  const folderPostsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return folderPostsRaw.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.body_text || "").toLowerCase().includes(q);
      const matchNetwork =
        !activeNetwork || p.target_networks.includes(activeNetwork);
      return matchSearch && matchNetwork;
    });
  }, [folderPostsRaw, search, activeNetwork]);

  // Sort posts inside folder
  const folderPostsSorted = useMemo(() => {
    const list = [...folderPostsFiltered];
    switch (sortKey) {
      case "name-asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case "name-desc":
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case "date-desc":
        return list.sort((a, b) => b.id - a.id);
      case "date-asc":
        return list.sort((a, b) => a.id - b.id);
    }
  }, [folderPostsFiltered, sortKey]);

  // Build root sections — todos los proyectos, incluso sin posts
  const rootSections = useMemo(() => {
    const sections: Array<{
      project: Project | null;
      posts: DraftPost[];
      key: string;
    }> = [];
    for (const project of projects) {
      const projectPosts = postsByProject.get(project.id) ?? [];
      sections.push({ project, posts: projectPosts, key: String(project.id) });
    }
    const unassigned = postsByProject.get(null) ?? [];
    if (unassigned.length > 0) {
      sections.push({ project: null, posts: unassigned, key: "unassigned" });
    }
    return sections;
  }, [projects, postsByProject]);

  // Sort root sections (for both folders-grid and list modes)
  const sortedRootSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? [...rootSections].filter(({ project }) =>
          (project?.name ?? "Sin proyecto").toLowerCase().includes(q),
        )
      : [...rootSections];
    switch (sortKey) {
      case "name-asc":
        return list.sort((a, b) =>
          (a.project?.name ?? "").localeCompare(b.project?.name ?? ""),
        );
      case "name-desc":
        return list.sort((a, b) =>
          (b.project?.name ?? "").localeCompare(a.project?.name ?? ""),
        );
      case "date-desc":
        return list.sort((a, b) => (b.project?.id ?? 0) - (a.project?.id ?? 0));
      case "date-asc":
        return list.sort((a, b) => (a.project?.id ?? 0) - (b.project?.id ?? 0));
    }
  }, [rootSections, sortKey, search]);

  const isEmpty =
    !isLoading && rootSections.length === 0 && activeFolder == null;
  const isFilterEmpty =
    !isLoading &&
    rootSections.length > 0 &&
    sortedRootSections.length === 0 &&
    activeFolder == null;

  return (
    <div className="space-y-6 animate-page-in">
      {/* Top bar */}
      <div>
        {activeFolder != null ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exitFolder}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={16} />
                <span>Contenido</span>
              </Button>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold text-foreground">
                {folderLabel}
              </span>
            </div>
            <Button
              onClick={() =>
                navigate(
                  activeFolder !== "unassigned"
                    ? `/compose?project=${activeFolder}`
                    : "/compose",
                )
              }
            >
              <Plus size={14} />
              Nuevo contenido
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Contenido</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Revisá, aprobá y publicá contenido por proyecto.
                </p>
              </div>
              <Button
                onClick={() =>
                  navigate(
                    activeFolder && activeFolder !== "unassigned"
                      ? `/compose?project=${activeFolder}`
                      : "/compose",
                  )
                }
              >
                <Plus size={14} />
                Nuevo contenido
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle — hidden when inside a folder */}
        {activeFolder == null && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 ml-auto">
            <button
              onClick={() => switchView("folders")}
              title="Vista carpetas"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewMode === "folders"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => switchView("list")}
              title="Vista lista"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewMode === "list"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Search + sort + network filters */}
      {(posts?.length ?? 0) > 0 && (
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
                placeholder="Buscar contenido..."
                className="w-full pl-8"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="name-asc">A → Z</option>
              <option value="name-desc">Z → A</option>
              <option value="date-desc">Más reciente</option>
              <option value="date-asc">Más antiguo</option>
            </select>
          </div>
          {allNetworks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveNetwork(null)}
                className={cn(
                  "rounded-[12px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  activeNetwork === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                Todas las redes
              </button>
              {allNetworks.map((net) => (
                <button
                  key={net}
                  onClick={() =>
                    setActiveNetwork(activeNetwork === net ? null : net)
                  }
                  className={cn(
                    "rounded-[12px] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    activeNetwork === net
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {net}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Cargando contenido...
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-sm text-destructive">
          No se pudo cargar el contenido.
        </p>
      )}

      {!isLoading && (
        <>
          {/* ── INSIDE A FOLDER ── */}
          {activeFolder != null && (
            <div className="space-y-3">
              {folderPostsSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
                  <FileText size={24} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No hay contenido en esta carpeta.
                  </p>
                </div>
              ) : (
                folderPostsSorted.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          )}

          {/* ── ROOT — empty state ── */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <FileText size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No hay contenido.</p>
            </div>
          )}

          {/* ── ROOT — filter empty state ── */}
          {isFilterEmpty && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Search size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Sin proyectos que coincidan con la búsqueda.
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-2"
              >
                Limpiar búsqueda
              </Button>
            </div>
          )}

          {/* ── ROOT — FOLDERS mode: folder card grid ── */}
          {activeFolder == null &&
            !isEmpty &&
            !isFilterEmpty &&
            viewMode === "folders" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedRootSections.map(
                  ({ project, posts: sectionPosts, key }) => (
                    <FolderCard
                      key={key}
                      project={project}
                      sourceCount={sectionPosts.length}
                      countUnit="contenido"
                      onClick={() => enterFolder(key)}
                    />
                  ),
                )}
              </div>
            )}

          {/* ── ROOT — LIST mode: controlled accordions ── */}
          {activeFolder == null &&
            !isEmpty &&
            !isFilterEmpty &&
            viewMode === "list" && (
              <div className="space-y-3">
                {sortedRootSections.map(
                  ({ project, posts: sectionPosts, key }) => (
                    <ProjectSection
                      key={key}
                      project={project}
                      posts={sectionPosts}
                      open={sectionOpenMap[key] ?? false}
                      onToggle={() => toggleSection(key)}
                    />
                  ),
                )}
              </div>
            )}
        </>
      )}
    </div>
  );
}
