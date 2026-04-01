import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchContent } from "../content/api";
import type { DraftPost } from "../content/types";

const STATUS_STYLES: Record<string, string> = {
  published:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending_approval:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-muted text-muted-foreground",
};

function ContentRow({ post }: { post: DraftPost }) {
  const statusClass =
    STATUS_STYLES[post.status] ?? "bg-muted text-muted-foreground";

  return (
    <div className="flex items-center gap-3 elegant-card p-3">
      <FileText size={14} className="text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {post.title}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {post.target_networks.map((n) => (
            <span
              key={n}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {n}
            </span>
          ))}
          {post.format && post.format !== "1:1" && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {post.format}
            </span>
          )}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-[12px] px-2 py-0.5 text-xs font-medium ${statusClass}`}
      >
        {post.status.replace(/_/g, " ")}
      </span>
    </div>
  );
}

export function ProjectContent({ projectId }: { projectId: number }) {
  const {
    data: allContent,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["content"],
    queryFn: fetchContent,
  });

  const posts = allContent?.filter((p) => p.project_id === projectId) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Cargando contenido...
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500">No se pudo cargar el contenido.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Contenido
          {posts.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              ({posts.length})
            </span>
          )}
        </h3>
        <Link
          to={`/compose?project=${projectId}`}
          className="inline-flex items-center gap-1 rounded-[14px] border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Plus size={12} />
          Nuevo contenido
        </Link>
      </div>

      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-border py-10 text-center">
          <FileText size={24} className="text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay contenido en este proyecto.
          </p>
          <Link
            to={`/compose?project=${projectId}`}
            className="mt-3 inline-flex items-center gap-1 rounded-[14px] border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Plus size={12} />
            Crear contenido
          </Link>
        </div>
      )}

      {posts.length > 0 && (
        <div className="space-y-2">
          {posts.map((post) => (
            <ContentRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
