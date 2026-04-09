import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  PenLine,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  Search,
  ArrowLeft,
  Plus,
  Trash2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../auth/use-auth";
import {
  fetchContent,
  completeContent,
  revertContent,
  deleteContent,
} from "./api";
import { fetchProjects, getProjectIconUrl } from "../projects/api";
import { fetchFormats } from "../generation/api";
import { FolderCard } from "../design-bank/folder-card";
import type { DraftPost } from "./types";
import type { Project } from "../projects/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "folders" | "list";
type ContentViewMode = "grid" | "list";
type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredView(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
  } catch {
    // ignore
  }
  return fallback;
}

function setStoredView(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function getActiveFolderProject(
  activeFolder: string | null,
  projects: Project[],
): Project | null {
  if (!activeFolder || activeFolder === "unassigned") return null;
  const id = Number(activeFolder);
  return projects.find((project) => project.id === id) ?? null;
}

function getFolderPosts(
  activeFolder: string | null,
  postsByProject: Map<number | null, DraftPost[]>,
): DraftPost[] {
  if (!activeFolder) return [];
  if (activeFolder === "unassigned") return postsByProject.get(null) ?? [];
  return postsByProject.get(Number(activeFolder)) ?? [];
}

function sortPostsByKey(posts: DraftPost[], sortKey: SortKey): DraftPost[] {
  const list = [...posts];
  switch (sortKey) {
    case "name-asc":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case "name-desc":
      return list.sort((a, b) => b.title.localeCompare(a.title));
    case "date-desc":
      return list.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    case "date-asc":
      return list.sort(
        (a, b) =>
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      );
  }
}

function buildRootSections(
  projects: Project[],
  postsByProject: Map<number | null, DraftPost[]>,
): Array<{ project: Project | null; posts: DraftPost[]; key: string }> {
  const sections: Array<{
    project: Project | null;
    posts: DraftPost[];
    key: string;
  }> = projects.map((project) => ({
    project,
    posts: postsByProject.get(project.id) ?? [],
    key: String(project.id),
  }));
  const unassignedPosts = postsByProject.get(null) ?? [];
  if (unassignedPosts.length > 0) {
    sections.push({ project: null, posts: unassignedPosts, key: "unassigned" });
  }
  return sections;
}

function sortRootSections(
  rootSections: Array<{
    project: Project | null;
    posts: DraftPost[];
    key: string;
  }>,
  sortKey: SortKey,
  search: string,
) {
  const query = search.trim().toLowerCase();
  const list = query
    ? rootSections.filter(({ project }) =>
        (project?.name ?? "No project").toLowerCase().includes(query),
      )
    : rootSections;

  switch (sortKey) {
    case "name-asc":
      return [...list].sort((a, b) =>
        (a.project?.name ?? "").localeCompare(b.project?.name ?? ""),
      );
    case "name-desc":
      return [...list].sort((a, b) =>
        (b.project?.name ?? "").localeCompare(a.project?.name ?? ""),
      );
    case "date-desc":
      return [...list].sort(
        (a, b) => (b.project?.id ?? 0) - (a.project?.id ?? 0),
      );
    case "date-asc":
      return [...list].sort(
        (a, b) => (a.project?.id ?? 0) - (b.project?.id ?? 0),
      );
  }
}

function renderFolderPostsContent(
  posts: DraftPost[],
  contentViewMode: ContentViewMode,
  formatMap: Map<string, string>,
): React.ReactNode {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
        <FileText size={24} className="mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No content in this folder.
        </p>
      </div>
    );
  }

  if (contentViewMode === "grid") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            formatMap={formatMap}
            viewMode="grid"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          formatMap={formatMap}
          viewMode="list"
        />
      ))}
    </div>
  );
}

function ReviewPageHeader({
  activeFolder,
  folderLabel,
  composePath,
  contentViewMode,
  switchContentView,
  exitFolder,
  onNavigate,
}: Readonly<{
  activeFolder: string | null;
  folderLabel: string | null;
  composePath: string;
  contentViewMode: ContentViewMode;
  switchContentView: (mode: ContentViewMode) => void;
  exitFolder: () => void;
  onNavigate: (path: string) => void;
}>) {
  if (activeFolder == null) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and manage content by project.
          </p>
        </div>
        <Button onClick={() => onNavigate(composePath)}>
          <Plus size={14} />
          New content
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={exitFolder}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          <span>Content</span>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-foreground">{folderLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
          <button
            onClick={() => switchContentView("grid")}
            title="Grid view"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              contentViewMode === "grid"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => switchContentView("list")}
            title="List view"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              contentViewMode === "list"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutList size={14} />
          </button>
        </div>
        <Button onClick={() => onNavigate(composePath)}>
          <Plus size={14} />
          New content
        </Button>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    label: string;
    tone: "success" | "warning" | "danger" | "info" | "neutral";
  }
> = {
  draft: { icon: <PenLine size={11} />, label: "Draft", tone: "neutral" },
  completed: {
    icon: <ShieldCheck size={11} />,
    label: "Verified",
    tone: "success",
  },
};

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

function PostStatusAction({
  status,
  compact,
  isCompletePending,
  isRevertPending,
  onComplete,
  onRevert,
}: Readonly<{
  status: DraftPost["status"];
  compact: boolean;
  isCompletePending: boolean;
  isRevertPending: boolean;
  onComplete: React.MouseEventHandler<HTMLButtonElement>;
  onRevert: React.MouseEventHandler<HTMLButtonElement>;
}>) {
  if (status !== "draft" && status !== "completed") return null;

  const isDraft = status === "draft";
  const iconSize = compact ? 11 : 12;
  const actionClassName = compact ? "gap-1 h-7 px-2 text-xs" : "gap-1.5";
  const isPending = isDraft ? isCompletePending : isRevertPending;
  const actionVariant = isDraft || compact ? "ghost" : "outline";
  let actionLabel = "Revert to draft";
  if (isDraft) {
    actionLabel = compact ? "Verify" : "Mark verified";
  } else if (compact) {
    actionLabel = "Revert";
  }
  const actionHandler = isDraft ? onComplete : onRevert;
  let actionIcon = <PenLine size={iconSize} />;
  if (isPending) {
    actionIcon = <Loader2 size={iconSize} className="animate-spin" />;
  } else if (isDraft) {
    actionIcon = <ShieldCheck size={iconSize} />;
  }

  return (
    <Button
      onClick={actionHandler}
      disabled={isPending}
      size="sm"
      variant={actionVariant}
      className={actionClassName}
    >
      {actionIcon}
      {actionLabel}
    </Button>
  );
}

function PostDeleteAction({
  confirmDelete,
  compact,
  isDeletePending,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: Readonly<{
  confirmDelete: boolean;
  compact: boolean;
  isDeletePending: boolean;
  onConfirmDelete: React.MouseEventHandler<HTMLButtonElement>;
  onCancelDelete: React.MouseEventHandler<HTMLButtonElement>;
  onDelete: React.MouseEventHandler<HTMLButtonElement>;
}>) {
  const confirmDeleteWrapperClassName = compact
    ? "flex items-center gap-1"
    : "ml-auto flex items-center gap-1.5";
  const deleteButtonClassName = compact
    ? "h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
    : "ml-auto gap-1.5 text-muted-foreground hover:text-destructive";
  let deleteActionContent: React.ReactNode = <Trash2 size={12} />;
  if (isDeletePending) {
    deleteActionContent = (
      <Loader2 size={compact ? 11 : 12} className="animate-spin" />
    );
  } else if (compact) {
    deleteActionContent = "Delete";
  }

  if (!confirmDelete) {
    return (
      <Button
        onClick={onConfirmDelete}
        size="sm"
        variant="ghost"
        className={deleteButtonClassName}
      >
        <Trash2 size={12} />
        {!compact && "Delete"}
      </Button>
    );
  }

  return (
    <div className={confirmDeleteWrapperClassName}>
      <Button
        onClick={onDelete}
        disabled={isDeletePending}
        size="sm"
        variant="destructive"
        className={compact ? "h-7 px-2 text-xs" : "gap-1.5"}
      >
        {deleteActionContent}
        {!compact && "Confirm delete"}
      </Button>
      <Button
        onClick={onCancelDelete}
        size="sm"
        variant="ghost"
        className={compact ? "h-7 px-2 text-xs" : undefined}
      >
        Cancel
      </Button>
    </div>
  );
}

function PostCardActions({
  status,
  confirmDelete,
  compact = false,
  isCompletePending,
  isRevertPending,
  isDeletePending,
  onComplete,
  onRevert,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: Readonly<{
  status: DraftPost["status"];
  confirmDelete: boolean;
  compact?: boolean;
  isCompletePending: boolean;
  isRevertPending: boolean;
  isDeletePending: boolean;
  onComplete: React.MouseEventHandler<HTMLButtonElement>;
  onRevert: React.MouseEventHandler<HTMLButtonElement>;
  onConfirmDelete: React.MouseEventHandler<HTMLButtonElement>;
  onCancelDelete: React.MouseEventHandler<HTMLButtonElement>;
  onDelete: React.MouseEventHandler<HTMLButtonElement>;
}>) {
  return (
    <>
      <PostStatusAction
        status={status}
        compact={compact}
        isCompletePending={isCompletePending}
        isRevertPending={isRevertPending}
        onComplete={onComplete}
        onRevert={onRevert}
      />
      <PostDeleteAction
        confirmDelete={confirmDelete}
        compact={compact}
        isDeletePending={isDeletePending}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
        onDelete={onDelete}
      />
    </>
  );
}

function PostCard({
  post,
  formatMap,
  viewMode,
}: Readonly<{
  post: DraftPost;
  formatMap: Map<string, string>;
  viewMode: ContentViewMode;
}>) {
  const { isOwner, isEditor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const completeMutation = useMutation({
    mutationFn: () => completeContent(post.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["content"] }),
  });

  const revertMutation = useMutation({
    mutationFn: () => revertContent(post.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["content"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContent(post.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["content"] }),
  });

  const canEdit = isOwner || isEditor;
  const cfg = statusConfig[post.status] ?? statusConfig.draft;
  const formatLabel = post.format
    ? (formatMap.get(post.format) ?? post.format)
    : null;
  const handleComplete: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation();
    completeMutation.mutate();
  };
  const handleRevert: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    revertMutation.mutate();
  };
  const handleDeleteConfirm: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation();
    deleteMutation.mutate();
  };
  const handleDeleteStart: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation();
    setConfirmDelete(true);
  };
  const handleDeleteCancel: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation();
    setConfirmDelete(false);
  };

  if (viewMode === "list") {
    return (
      <div className="group relative flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-accent/30 cursor-pointer">
        <button
          type="button"
          aria-label={`Open ${post.title}`}
          className="absolute inset-0 rounded-lg"
          onClick={() => navigate(`/compose?postId=${post.id}`)}
        />
        <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {post.title}
            </span>
          </div>
          {formatLabel && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {formatLabel}
            </span>
          )}
          <Badge variant={cfg.tone} className="gap-1 shrink-0">
            {cfg.icon}
            {cfg.label}
          </Badge>
          <span
            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground"
            title={`Updated ${post.updated_at}`}
          >
            <Clock size={11} />
            {relativeTime(post.updated_at)}
          </span>
        </div>
        {canEdit && (
          <div className="relative z-10 shrink-0 flex items-center gap-1">
            <PostCardActions
              status={post.status}
              confirmDelete={confirmDelete}
              compact
              isCompletePending={completeMutation.isPending}
              isRevertPending={revertMutation.isPending}
              isDeletePending={deleteMutation.isPending}
              onComplete={handleComplete}
              onRevert={handleRevert}
              onConfirmDelete={handleDeleteStart}
              onCancelDelete={handleDeleteCancel}
              onDelete={handleDeleteConfirm}
            />
          </div>
        )}
      </div>
    );
  }

  // Grid / card mode
  return (
    <div className="group relative space-y-3 rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors hover:bg-accent/30 cursor-pointer">
      <button
        type="button"
        aria-label={`Open ${post.title}`}
        className="absolute inset-0 rounded-lg"
        onClick={() => navigate(`/compose?postId=${post.id}`)}
      />
      <div className="pointer-events-none space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-foreground text-sm">
              {post.title}
            </h3>
            {post.body_text && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {post.body_text}
              </p>
            )}
          </div>
          <Badge variant={cfg.tone} className="gap-1 shrink-0">
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {formatLabel && (
            <span className="rounded bg-muted px-1.5 py-0.5">
              {formatLabel}
            </span>
          )}
          <span
            className="flex items-center gap-1"
            title={`Updated ${post.updated_at}`}
          >
            <Clock size={11} />
            {relativeTime(post.updated_at)}
          </span>
          {post.created_at && (
            <span title={`Created ${post.created_at}`}>
              Created {new Date(post.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="relative z-10 flex items-center gap-2">
          <PostCardActions
            status={post.status}
            confirmDelete={confirmDelete}
            isCompletePending={completeMutation.isPending}
            isRevertPending={revertMutation.isPending}
            isDeletePending={deleteMutation.isPending}
            onComplete={handleComplete}
            onRevert={handleRevert}
            onConfirmDelete={handleDeleteStart}
            onCancelDelete={handleDeleteCancel}
            onDelete={handleDeleteConfirm}
          />
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
  formatMap,
  contentViewMode,
}: Readonly<{
  project: Project | null;
  posts: DraftPost[];
  open: boolean;
  onToggle: () => void;
  formatMap: Map<string, string>;
  contentViewMode: ContentViewMode;
}>) {
  const label = project ? project.name : "No project";
  const color = project?.color ?? "#6b7280";
  let sectionContent: React.ReactNode;
  if (posts.length === 0) {
    sectionContent = (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No content in this section.
      </p>
    );
  } else if (contentViewMode === "grid") {
    sectionContent = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            formatMap={formatMap}
            viewMode="grid"
          />
        ))}
      </div>
    );
  } else {
    sectionContent = (
      <div className="space-y-2">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            formatMap={formatMap}
            viewMode="list"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
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
              className={project == null ? "text-muted-foreground" : ""}
            >
              {open ? <FolderOpen size={18} /> : <Folder size={18} />}
            </span>
          )}
        </span>
        <span className="font-medium text-sm text-foreground flex-1 truncate">
          {label}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {posts.length} {posts.length === 1 ? "item" : "items"}
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
        <div className="border-t border-border bg-background/50 p-4">
          {sectionContent}
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
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => getStoredView("review-global-view", "folders") as ViewMode,
  );
  const [contentViewMode, setContentViewMode] = useState<ContentViewMode>(
    () => getStoredView("review-content-view", "grid") as ContentViewMode,
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

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
    setStoredView("review-global-view", mode);
  }

  function switchContentView(mode: ContentViewMode) {
    setContentViewMode(mode);
    setStoredView("review-content-view", mode);
  }

  function enterFolder(folderId: string) {
    setActiveFolder(folderId);
    setSearch("");
  }

  function exitFolder() {
    setActiveFolder(null);
    setSearch("");
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

  const { data: formats = [] } = useQuery({
    queryKey: ["formats"],
    queryFn: fetchFormats,
    staleTime: 60_000,
  });

  // Build format key → label map
  const formatMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of formats) {
      m.set(f.key, f.label);
    }
    return m;
  }, [formats]);

  const isLoading = postsLoading || projectsLoading;

  // All posts (no status filter)
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
  const activeFolderProject = useMemo(
    () => getActiveFolderProject(activeFolder, projects),
    [activeFolder, projects],
  );

  // Label for the active folder breadcrumb
  let folderLabel: string | null = activeFolderProject?.name ?? null;
  if (!folderLabel && activeFolder === "unassigned") {
    folderLabel = "No project";
  }

  // Posts inside the active folder (unfiltered by search/network)
  const folderPostsRaw = useMemo(
    () => getFolderPosts(activeFolder, postsByProject),
    [activeFolder, postsByProject],
  );

  // Apply search filter inside folder
  const folderPostsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return folderPostsRaw.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.body_text ?? "").toLowerCase().includes(q);
      return matchSearch;
    });
  }, [folderPostsRaw, search]);

  // Sort posts inside folder — use actual timestamps
  const folderPostsSorted = useMemo(
    () => sortPostsByKey(folderPostsFiltered, sortKey),
    [folderPostsFiltered, sortKey],
  );

  // Build root sections — all projects, including those with no posts
  const rootSections = useMemo(
    () => buildRootSections(projects, postsByProject),
    [projects, postsByProject],
  );

  // Sort root sections (for both folders-grid and list modes)
  const sortedRootSections = useMemo(
    () => sortRootSections(rootSections, sortKey, search),
    [rootSections, sortKey, search],
  );

  const isEmpty =
    !isLoading && rootSections.length === 0 && activeFolder == null;
  const isFilterEmpty =
    !isLoading &&
    rootSections.length > 0 &&
    sortedRootSections.length === 0 &&
    activeFolder == null;
  const composePath =
    activeFolder != null && activeFolder !== "unassigned"
      ? `/compose?project=${activeFolder}`
      : "/compose";
  const folderContent = renderFolderPostsContent(
    folderPostsSorted,
    contentViewMode,
    formatMap,
  );

  return (
    <div className="space-y-6 animate-page-in">
      {/* Top bar */}
      <div>
        <ReviewPageHeader
          activeFolder={activeFolder}
          folderLabel={folderLabel}
          composePath={composePath}
          contentViewMode={contentViewMode}
          switchContentView={switchContentView}
          exitFolder={exitFolder}
          onNavigate={navigate}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle — hidden when inside a folder */}
        {activeFolder == null && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 ml-auto">
            <button
              onClick={() => switchView("folders")}
              title="Folder view"
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
              title="List view"
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

      {/* Search + sort */}
      {(posts?.length ?? 0) > 0 && (
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
              placeholder="Search content..."
              className="w-full pl-8"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="flex w-40 shrink-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">A → Z</option>
            <option value="name-desc">Z → A</option>
          </select>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading content...
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-sm text-destructive">Failed to load content.</p>
      )}

      {!isLoading && (
        <>
          {/* ── INSIDE A FOLDER ── */}
          {activeFolder != null && <div>{folderContent}</div>}

          {/* ── ROOT — empty state ── */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <FileText size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No content yet.</p>
            </div>
          )}

          {/* ── ROOT — filter empty state ── */}
          {isFilterEmpty && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Search size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No projects match this search.
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-2"
              >
                Clear search
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
                      countUnit="items"
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
                      formatMap={formatMap}
                      contentViewMode={contentViewMode}
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
