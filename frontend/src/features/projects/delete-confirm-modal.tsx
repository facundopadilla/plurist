import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              <DialogDescription className="text-xs mt-0.5">
                Esta acción no se puede deshacer.
              </DialogDescription>
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
            <p className="text-xs text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "Error al eliminar"}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Eliminar proyecto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
