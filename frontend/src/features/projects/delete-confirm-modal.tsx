import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { ElegantModal } from "../../components/ui/elegant-modal";
import { deleteProject } from "./api";
import type { Project } from "./types";

interface Props {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmModal({
  project,
  open,
  onClose,
  onDeleted,
}: Props) {
  const [cascadePosts, setCascadePosts] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!project) throw new Error("No project");
      return deleteProject(project.id, cascadePosts);
    },
    onSuccess: () => {
      onDeleted();
    },
  });

  if (!project) return null;

  return (
    <ElegantModal
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      maxWidth="max-w-sm"
      title="Confirmar eliminación"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
            <AlertTriangle
              size={20}
              className="text-red-600 dark:text-red-400"
            />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              ¿Eliminar {project.name}?
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Los recursos del Design Bank se eliminarán automáticamente.
        </p>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cascadePosts}
            onChange={(e) => setCascadePosts(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="text-sm text-muted-foreground">
            También eliminar el contenido asociado a este proyecto
          </span>
        </label>

        {deleteMutation.isError && (
          <p className="text-xs text-red-500">
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "Error al eliminar"}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="elegant-button-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-[14px] bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Eliminar proyecto
          </button>
        </div>
      </div>
    </ElegantModal>
  );
}
