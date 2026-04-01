import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Folder,
  ImageIcon,
  FileText,
  Loader2,
  Tag,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { fetchProject, getProjectIconUrl } from "./api";
import { ProjectDesignBank } from "./project-design-bank";
import { ProjectContent } from "./project-content";
import { Breadcrumb } from "./breadcrumb";
import { ProjectEditModal } from "./project-edit-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import { useAuth } from "../auth/use-auth";

type Tab = "design-bank" | "content";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOwner, isEditor } = useAuth();
  const canEdit = isOwner || isEditor;

  const [activeTab, setActiveTab] = useState<Tab>("design-bank");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Loading project...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <p className="text-sm text-red-500">
        Project not found or failed to load.
      </p>
    );
  }

  const tabLabel = activeTab === "design-bank" ? "Design Bank" : "Contenido";
  const accentBg = (project.color || "#6366f1") + "1a";

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb
        crumbs={[
          { label: "Proyectos", to: "/projects" },
          { label: project.name, to: `/projects/${id}` },
          { label: tabLabel },
        ]}
      />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg shrink-0 overflow-hidden"
          style={{ backgroundColor: accentBg }}
        >
          {project.icon_url ? (
            <img
              src={getProjectIconUrl(project.id)}
              alt={project.name}
              className="h-11 w-11 object-cover"
            />
          ) : (
            <FolderOpen
              size={22}
              style={{ color: project.color || "#6366f1" }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {project.name}
            </h1>
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: project.color || "#6366f1" }}
            />
          </div>
          {project.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="inline-flex items-center gap-1 rounded-[12px] px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: tag.color + "20",
                    color: tag.color,
                  }}
                >
                  <Tag size={10} />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 rounded-[14px] border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <Pencil size={12} />
              Editar
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-[14px] border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1">
          {(
            [
              { key: "design-bank", label: "Design Bank", icon: ImageIcon },
              { key: "content", label: "Contenido", icon: FileText },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-2 px-4 pb-3 pt-2 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-md",
                  isActive
                    ? "border-primary text-foreground bg-accent/30"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20",
                )}
              >
                {isActive ? <FolderOpen size={14} /> : <Folder size={14} />}
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "design-bank" && <ProjectDesignBank projectId={id} />}
      {activeTab === "content" && <ProjectContent projectId={id} />}

      <ProjectEditModal
        project={project}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["project", id] });
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          setShowEdit(false);
        }}
      />

      <DeleteConfirmModal
        project={project}
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          navigate("/projects");
        }}
      />
    </div>
  );
}
