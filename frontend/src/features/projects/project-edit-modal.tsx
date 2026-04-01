import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus, Upload, ImageIcon } from "lucide-react";
import { ElegantModal } from "../../components/ui/elegant-modal";
import { TagIconPicker } from "./tag-icon-picker";
import { updateProject, uploadProjectIcon } from "./api";
import type { Project, ProjectTag } from "./types";

const COLOR_PRESETS = [
  "#6366f1",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface Props {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectEditModal({ project, open, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setColor(project.color || "#6366f1");
      setTags(
        project.tags.map((t) => ({
          name: t.name,
          color: t.color,
          icon: t.icon ?? "",
        })),
      );
      setIconFile(null);
      setIconPreview(null);
    }
  }, [project]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const updated = await updateProject(project.id, {
        name,
        description,
        color,
        tags,
      });
      if (iconFile) {
        await uploadProjectIcon(project.id, iconFile);
      }
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({
        queryKey: ["project", project?.id],
      });
      onSaved();
    },
  });

  if (!project) return null;

  function addTag() {
    setTags([...tags, { name: "", color: "#6b7280", icon: "" }]);
  }

  function updateTag(index: number, field: keyof ProjectTag, value: string) {
    setTags(tags.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const currentIconUrl = project.icon_url
    ? `/api/v1/projects/${project.id}/icon`
    : null;

  return (
    <ElegantModal
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Editar proyecto"
      showHeader
      maxWidth="max-w-lg"
    >
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="elegant-input w-full"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="elegant-input w-full resize-none"
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "transparent",
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
              title="Color personalizado"
            />
          </div>
        </div>

        {/* Icon */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ícono personalizado</label>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl border border-border overflow-hidden flex items-center justify-center bg-muted/30">
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
              ) : currentIconUrl ? (
                <img
                  src={currentIconUrl}
                  alt="icon"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon size={24} className="text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-[14px] border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <Upload size={12} />
                {currentIconUrl || iconPreview ? "Cambiar" : "Subir ícono"}
              </button>
              {(iconPreview || currentIconUrl) && (
                <button
                  onClick={() => {
                    setIconFile(null);
                    setIconPreview(null);
                  }}
                  className="block text-xs text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Quitar preview
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP · Máx 2MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={handleIconChange}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <div className="space-y-2">
            {tags.map((tag, i) => (
              <div key={i} className="flex items-center gap-2">
                <TagIconPicker
                  value={tag.icon ?? ""}
                  onChange={(name) => updateTag(i, "icon", name)}
                />
                <input
                  type="text"
                  value={tag.name}
                  onChange={(e) => updateTag(i, "name", e.target.value)}
                  placeholder="Nombre del tag"
                  className="elegant-input flex-1 py-1.5"
                />
                <input
                  type="color"
                  value={tag.color}
                  onChange={(e) => updateTag(i, "color", e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                  title="Color del tag"
                />
                <button
                  onClick={() => removeTag(i)}
                  className="rounded-[10px] p-1.5 text-muted-foreground hover:bg-accent hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addTag}
              className="inline-flex items-center gap-1.5 rounded-[14px] border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus size={12} />
              Agregar tag
            </button>
          </div>
        </div>

        {saveMutation.isError && (
          <p className="text-xs text-red-500">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Error al guardar"}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
        <button onClick={onClose} className="elegant-button-secondary">
          Cancelar
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className="elegant-button-primary"
        >
          {saveMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : null}
          Guardar
        </button>
      </div>
    </ElegantModal>
  );
}
