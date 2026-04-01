import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Upload,
  Globe,
  Palette,
  Type,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  uploadFile,
  ingestUrl,
  createColorResource,
  createFontResource,
  createTextResource,
} from "./api";
import type { Project } from "../projects/types";

type AddTab = "upload" | "url" | "color" | "font" | "text";

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  projects: Project[];
  projectId?: number | null;
}

export function AddResourceModal({
  open,
  onClose,
  onAdded,
  projects,
  projectId: initialProjectId,
}: AddResourceModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AddTab>("upload");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    initialProjectId ?? null,
  );
  const [urlValue, setUrlValue] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [colorRole, setColorRole] = useState("");
  const [fontName, setFontName] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textKind, setTextKind] = useState("copy");
  const [fileError, setFileError] = useState<string | null>(null);

  const invalidate = (pid: number | null) => {
    void queryClient.invalidateQueries({ queryKey: ["design-bank-sources"] });
    if (pid != null) {
      void queryClient.invalidateQueries({
        queryKey: ["project-sources", pid],
      });
    }
  };

  const fileMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, selectedProjectId ?? undefined),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onAdded();
    },
    onError: (err: Error) => setFileError(err.message),
  });

  const urlMutation = useMutation({
    mutationFn: () => ingestUrl(urlValue, selectedProjectId ?? undefined),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setUrlValue("");
      onAdded();
    },
  });

  const colorMutation = useMutation({
    mutationFn: () =>
      createColorResource({
        name: colorName,
        hex: colorHex,
        role: colorRole,
        project_id: selectedProjectId,
      }),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setColorName("");
      setColorRole("");
      onAdded();
    },
  });

  const fontMutation = useMutation({
    mutationFn: () =>
      createFontResource({
        name: fontName,
        family: fontFamily,
        project_id: selectedProjectId,
      }),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setFontName("");
      setFontFamily("");
      onAdded();
    },
  });

  const textMutation = useMutation({
    mutationFn: () =>
      createTextResource({
        name: textName,
        content: textContent,
        kind: textKind,
        project_id: selectedProjectId,
      }),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setTextName("");
      setTextContent("");
      onAdded();
    },
  });

  if (!open) return null;

  const showProjectSelector = initialProjectId == null;

  const tabs: { key: AddTab; label: string; icon: React.ReactNode }[] = [
    { key: "upload", label: "Archivo", icon: <Upload size={13} /> },
    { key: "url", label: "URL", icon: <Globe size={13} /> },
    { key: "color", label: "Color", icon: <Palette size={13} /> },
    { key: "font", label: "Fuente", icon: <Type size={13} /> },
    { key: "text", label: "Texto", icon: <FileText size={13} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-card rounded-xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Agregar recurso
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Project selector */}
        {showProjectSelector && projects.length > 0 && (
          <div className="px-5 pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Proyecto (opcional)
            </label>
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) =>
                setSelectedProjectId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div
          className={cn(
            "flex border-b border-border",
            showProjectSelector && projects.length > 0 ? "mt-4" : "mt-0",
          )}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                activeTab === t.key
                  ? "border-b-2 border-foreground text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "upload" && (
            <div>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">
                {fileMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {fileMutation.isPending
                  ? "Subiendo..."
                  : "Elegir archivo (imagen, PDF, etc.)"}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  disabled={fileMutation.isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) fileMutation.mutate(f);
                  }}
                />
              </label>
              {fileError && (
                <p className="mt-1 text-xs text-destructive">{fileError}</p>
              )}
              {fileMutation.isSuccess && (
                <p className="mt-1 text-xs text-green-600">
                  Archivo subido correctamente.
                </p>
              )}
            </div>
          )}

          {activeTab === "url" && (
            <div className="flex gap-2">
              <Input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                onClick={() => urlMutation.mutate()}
                disabled={urlMutation.isPending || !urlValue.trim()}
              >
                {urlMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Agregar
              </Button>
            </div>
          )}

          {activeTab === "color" && (
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="Nombre (ej. Primario)"
                className="flex-1 min-w-[120px]"
              />
              <div className="flex items-center gap-1.5 rounded-[14px] border border-input bg-background px-2 py-1">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {colorHex}
                </span>
              </div>
              <Input
                type="text"
                value={colorRole}
                onChange={(e) => setColorRole(e.target.value)}
                placeholder="Rol (opcional)"
                className="w-28"
              />
              <Button
                onClick={() => colorMutation.mutate()}
                disabled={colorMutation.isPending || !colorName.trim()}
              >
                {colorMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Agregar
              </Button>
            </div>
          )}

          {activeTab === "font" && (
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                placeholder="Nombre (ej. Fuente titular)"
                className="flex-1 min-w-[140px]"
              />
              <Input
                type="text"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="Familia (ej. Inter)"
                className="flex-1 min-w-[120px]"
              />
              <Button
                onClick={() => fontMutation.mutate()}
                disabled={
                  fontMutation.isPending ||
                  !fontName.trim() ||
                  !fontFamily.trim()
                }
              >
                {fontMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Agregar
              </Button>
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={textName}
                  onChange={(e) => setTextName(e.target.value)}
                  placeholder="Nombre (ej. Tagline)"
                  className="flex-1"
                />
                <select
                  value={textKind}
                  onChange={(e) => setTextKind(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="copy">Copy</option>
                  <option value="tagline">Tagline</option>
                  <option value="slogan">Slogan</option>
                  <option value="voice_notes">Notas de voz</option>
                </select>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Escribí tu copy de marca aquí..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex-1 resize-none"
                />
                <Button
                  onClick={() => textMutation.mutate()}
                  disabled={
                    textMutation.isPending ||
                    !textName.trim() ||
                    !textContent.trim()
                  }
                  className="self-end"
                >
                  {textMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} />
                  )}
                  Agregar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
