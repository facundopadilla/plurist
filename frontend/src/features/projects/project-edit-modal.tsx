import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus, Upload, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
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
                title="Custom color"
              />
            </div>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Custom icon</Label>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={12} />
                  {currentIconUrl || iconPreview ? "Replace" : "Upload icon"}
                </Button>
                {(iconPreview || currentIconUrl) && (
                  <button
                    onClick={() => {
                      setIconFile(null);
                      setIconPreview(null);
                    }}
                    className="block text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Remove preview
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP · Max 2MB
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
            <Label>Tags</Label>
            <div className="space-y-2">
              {tags.map((tag, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TagIconPicker
                    value={tag.icon ?? ""}
                    onChange={(name) => updateTag(i, "icon", name)}
                  />
                  <Input
                    type="text"
                    value={tag.name}
                    onChange={(e) => updateTag(i, "name", e.target.value)}
                    placeholder="Tag name"
                    className="flex-1 h-9"
                  />
                  <input
                    type="color"
                    value={tag.color}
                    onChange={(e) => updateTag(i, "color", e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                    title="Tag color"
                  />
                  <button
                    onClick={() => removeTag(i)}
                    className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addTag}
                className="border-dashed text-muted-foreground"
              >
                <Plus size={12} />
                Add tag
              </Button>
            </div>
          </div>

          {saveMutation.isError && (
            <p className="text-xs text-destructive">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Failed to save project"}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
