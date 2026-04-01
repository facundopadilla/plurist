import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Palette,
  Type,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Plus,
  Globe,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  AlignLeft,
  Code,
  Paintbrush,
  Braces,
  FileCode,
  File,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../auth/use-auth";
import {
  fetchProjectSources,
  uploadFile,
  ingestUrl,
  createColorResource,
  createFontResource,
  createTextResource,
  deleteSource,
  getSourceFileUrl,
} from "../design-bank/api";
import { SourceDetailModal } from "../design-bank/source-detail-modal";
import type { DesignBankSource } from "../design-bank/types";

type AddTab = "upload" | "url" | "color" | "font" | "text";
type ViewMode = "grid" | "list";

function sourceIcon(type: string) {
  const t = type.toLowerCase();
  if (["image", "jpg", "jpeg", "png", "gif", "svg", "webp", "logo"].includes(t))
    return <ImageIcon size={14} className="text-muted-foreground" />;
  if (t === "pdf") return <FileText size={14} className="text-red-500" />;
  if (t === "color")
    return <Palette size={14} className="text-muted-foreground" />;
  if (t === "font") return <Type size={14} className="text-muted-foreground" />;
  if (t === "text")
    return <AlignLeft size={14} className="text-muted-foreground" />;
  if (t === "html") return <Code size={14} className="text-muted-foreground" />;
  if (["css", "design_system"].includes(t))
    return <Paintbrush size={14} className="text-muted-foreground" />;
  if (["js", "javascript"].includes(t))
    return <Braces size={14} className="text-muted-foreground" />;
  if (t === "markdown")
    return <FileCode size={14} className="text-muted-foreground" />;
  if (t === "url") return <Globe size={14} className="text-muted-foreground" />;
  return <File size={14} className="text-muted-foreground" />;
}

function statusBadge(status: string) {
  if (status === "ready")
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle size={10} /> ready
      </span>
    );
  if (status === "processing")
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Loader2 size={10} className="animate-spin" /> processing
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <XCircle size={10} /> failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">
      pending
    </span>
  );
}

function ResourceCard({
  source,
  canDelete,
  onDelete,
  onClick,
}: {
  source: DesignBankSource;
  canDelete: boolean;
  onDelete: () => void;
  onClick?: () => void;
}) {
  const rd = (source.resource_data ?? {}) as Record<string, string>;
  const label =
    source.name || source.original_filename || source.url || `#${source.id}`;
  const t = source.source_type.toLowerCase();
  const isImage = [
    "image",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "svg",
    "webp",
    "logo",
  ].includes(t);
  const showThumbnail =
    isImage && source.status === "ready" && source.storage_key;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm p-3",
        onClick && "cursor-pointer hover:bg-accent/30 transition-colors",
      )}
    >
      {showThumbnail ? (
        <img
          src={getSourceFileUrl(source.id)}
          alt={label}
          className="h-12 w-12 rounded object-cover shrink-0 border border-border"
        />
      ) : t === "color" && rd.hex ? (
        <div
          className="h-8 w-8 rounded-lg border border-border shrink-0 mt-0.5"
          style={{ background: rd.hex }}
        />
      ) : (
        <div className="mt-0.5 shrink-0">{sourceIcon(source.source_type)}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {statusBadge(source.status)}
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {source.source_type}
          </span>
          {t === "color" && rd.role && (
            <span className="text-xs text-muted-foreground">{rd.role}</span>
          )}
          {t === "font" && rd.family && (
            <span className="text-xs text-muted-foreground">{rd.family}</span>
          )}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Remove resource"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function ResourceRow({
  source,
  canDelete,
  onDelete,
  onClick,
}: {
  source: DesignBankSource;
  canDelete: boolean;
  onDelete: () => void;
  onClick?: () => void;
}) {
  const rd = (source.resource_data ?? {}) as Record<string, string>;
  const label =
    source.name || source.original_filename || source.url || `#${source.id}`;
  const t = source.source_type.toLowerCase();

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 transition-colors",
        onClick ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/40",
      )}
    >
      <div className="shrink-0">{sourceIcon(source.source_type)}</div>
      {t === "color" && rd.hex && (
        <span
          className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
          style={{ background: rd.hex }}
        />
      )}
      <p className="text-sm text-foreground truncate flex-1">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        {statusBadge(source.status)}
        <span className="text-xs text-muted-foreground uppercase tracking-wide hidden sm:inline">
          {source.source_type}
        </span>
        {t === "font" && rd.family && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {rd.family}
          </span>
        )}
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Remove resource"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function AddResourcePanel({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AddTab>("upload");
  const [urlValue, setUrlValue] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [colorRole, setColorRole] = useState("");
  const [fontName, setFontName] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textKind, setTextKind] = useState("copy");

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: ["project-sources", projectId],
    });

  const fileMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, projectId),
    onSuccess: invalidate,
  });

  const urlMutation = useMutation({
    mutationFn: () => ingestUrl(urlValue, projectId),
    onSuccess: () => {
      invalidate();
      setUrlValue("");
    },
  });

  const colorMutation = useMutation({
    mutationFn: () =>
      createColorResource({
        name: colorName,
        hex: colorHex,
        role: colorRole,
        project_id: projectId,
      }),
    onSuccess: () => {
      invalidate();
      setColorName("");
      setColorRole("");
    },
  });

  const fontMutation = useMutation({
    mutationFn: () =>
      createFontResource({
        name: fontName,
        family: fontFamily,
        project_id: projectId,
      }),
    onSuccess: () => {
      invalidate();
      setFontName("");
      setFontFamily("");
    },
  });

  const textMutation = useMutation({
    mutationFn: () =>
      createTextResource({
        name: textName,
        content: textContent,
        kind: textKind,
        project_id: projectId,
      }),
    onSuccess: () => {
      invalidate();
      setTextName("");
      setTextContent("");
    },
  });

  const tabs: { key: AddTab; label: string; icon: React.ReactNode }[] = [
    { key: "upload", label: "Archivo", icon: <Upload size={13} /> },
    { key: "url", label: "URL", icon: <Globe size={13} /> },
    { key: "color", label: "Color", icon: <Palette size={13} /> },
    { key: "font", label: "Fuente", icon: <Type size={13} /> },
    { key: "text", label: "Texto", icon: <FileText size={13} /> },
  ];

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
              activeTab === t.key
                ? "border-b-2 border-primary text-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "upload" && (
          <div>
            <label className="flex cursor-pointer items-center gap-2 rounded-[14px] border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
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
            {fileMutation.isError && (
              <p className="mt-1 text-xs text-destructive">
                {fileMutation.error instanceof Error
                  ? fileMutation.error.message
                  : "Upload fallido"}
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
                fontMutation.isPending || !fontName.trim() || !fontFamily.trim()
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
                rows={2}
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
  );
}

export function ProjectDesignBank({ projectId }: { projectId: number }) {
  const { isOwner, isEditor } = useAuth();
  const canEdit = isOwner || isEditor;
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("db-view-mode") as ViewMode) ?? "grid",
  );

  const setView = (mode: ViewMode) => {
    localStorage.setItem("db-view-mode", mode);
    setViewMode(mode);
  };

  const [selectedSource, setSelectedSource] = useState<DesignBankSource | null>(
    null,
  );

  const {
    data: sources,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["project-sources", projectId],
    queryFn: () => fetchProjectSources(projectId),
    refetchOnMount: true,
    refetchInterval: (query) => {
      const data = query.state.data as DesignBankSource[] | undefined;
      if (!data) return false;
      const hasTransient = data.some(
        (s) => s.status === "pending" || s.status === "processing",
      );
      return hasTransient ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSource(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["project-sources", projectId],
      }),
  });

  return (
    <div className="space-y-4">
      {canEdit && <AddResourcePanel projectId={projectId} />}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Cargando recursos...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          No se pudo cargar el design bank.
        </p>
      )}

      {sources && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {sources.length === 0
                ? "Sin recursos"
                : `${sources.length} recurso${sources.length !== 1 ? "s" : ""}`}
            </span>
            <div className="flex gap-0.5 rounded-[14px] border border-border overflow-hidden">
              <button
                onClick={() => setView("grid")}
                title="Vista grid"
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("list")}
                title="Vista lista"
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "Agregá colores, fuentes, imágenes y copy arriba."
                : "No hay recursos todavía."}
            </p>
          )}

          {sources.length > 0 && viewMode === "grid" && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((source) => (
                <ResourceCard
                  key={source.id}
                  source={source}
                  canDelete={canEdit}
                  onDelete={() => deleteMutation.mutate(source.id)}
                  onClick={() => setSelectedSource(source)}
                />
              ))}
            </div>
          )}

          {sources.length > 0 && viewMode === "list" && (
            <div className="rounded-[18px] border border-border overflow-hidden divide-y divide-border">
              {sources.map((source) => (
                <ResourceRow
                  key={source.id}
                  source={source}
                  canDelete={canEdit}
                  onDelete={() => deleteMutation.mutate(source.id)}
                  onClick={() => setSelectedSource(source)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <SourceDetailModal
        source={selectedSource}
        open={selectedSource !== null}
        onClose={() => setSelectedSource(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ["project-sources", projectId],
          });
          setSelectedSource(null);
        }}
      />
    </div>
  );
}
