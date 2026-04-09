import { useRef, useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Palette,
  Type,
  FileText,
  Loader2,
  Trash2,
  Plus,
  Globe,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
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
import {
  DESIGN_BANK_INPUT_CLASSNAME,
  SourceTypeIcon,
  UploadResourceField,
} from "../design-bank/resource-ui";
import { SourceDetailModal } from "../design-bank/source-detail-modal";
import type { DesignBankSource } from "../design-bank/types";
import {
  DESIGN_BANK_POLL_MS,
  DESIGN_BANK_PROJECT_VIEW_MODE_KEY,
  isImageSourceType,
} from "../design-bank/constants";

type AddTab = "upload" | "url" | "color" | "font" | "text";
type ViewMode = "grid" | "list";

const STATUS_BADGES: Record<"ready" | "processing" | "failed", ReactElement> = {
  ready: (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      <CheckCircle size={10} /> ready
    </span>
  ),
  processing: (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
      <Loader2 size={10} className="animate-spin" /> processing
    </span>
  ),
  failed: (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
      <XCircle size={10} /> failed
    </span>
  ),
};

function statusBadge(status: string) {
  if (status === "ready" || status === "processing" || status === "failed") {
    return STATUS_BADGES[status];
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-800/70 bg-zinc-900/80 px-2 py-0.5 text-xs text-zinc-500">
      pending
    </span>
  );
}

function ResourceThumbnail({
  showThumbnail,
  sourceId,
  label,
  sourceType,
  colorHex,
}: Readonly<{
  showThumbnail: boolean;
  sourceId: number;
  label: string;
  sourceType: string;
  colorHex?: string;
}>) {
  if (showThumbnail) {
    return (
      <img
        src={getSourceFileUrl(sourceId)}
        alt={label}
        className="h-12 w-12 shrink-0 rounded-lg border border-zinc-800/70 object-cover"
      />
    );
  }
  if (colorHex) {
    return (
      <div
        className="mt-0.5 h-8 w-8 shrink-0 rounded-lg border border-zinc-800/70"
        style={{ background: colorHex }}
      />
    );
  }
  return (
    <div className="mt-0.5 shrink-0">
      <SourceTypeIcon sourceType={sourceType} size={14} />
    </div>
  );
}

function ResourceCard({
  source,
  canDelete,
  onDelete,
  onClick,
}: Readonly<{
  source: DesignBankSource;
  canDelete: boolean;
  onDelete: () => void;
  onClick?: () => void;
}>) {
  const rd = (source.resource_data ?? {}) as Record<string, string>;
  const label =
    source.name || source.original_filename || source.url || `#${source.id}`;
  const t = source.source_type.toLowerCase();
  const isImage = isImageSourceType(t);
  const showThumbnail =
    isImage && source.status === "ready" && source.storage_key;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/25 p-3 text-zinc-100",
        onClick && "cursor-pointer transition-colors hover:bg-white/[0.03]",
      )}
    >
      {onClick && (
        <button
          type="button"
          aria-label={`Open ${label}`}
          className="absolute inset-0 rounded-2xl"
          onClick={onClick}
        />
      )}
      <div className="pointer-events-none flex min-w-0 flex-1 items-start gap-3">
        <ResourceThumbnail
          showThumbnail={!!showThumbnail}
          sourceId={source.id}
          label={label}
          sourceType={source.source_type}
          colorHex={t === "color" ? rd.hex : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {label}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {statusBadge(source.status)}
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              {source.source_type}
            </span>
            {t === "color" && rd.role && (
              <span className="text-xs text-zinc-500">{rd.role}</span>
            )}
            {t === "font" && rd.family && (
              <span className="text-xs text-zinc-500">{rd.family}</span>
            )}
          </div>
        </div>
      </div>
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="pointer-events-auto shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
}: Readonly<{
  source: DesignBankSource;
  canDelete: boolean;
  onDelete: () => void;
  onClick?: () => void;
}>) {
  const rd = (source.resource_data ?? {}) as Record<string, string>;
  const label =
    source.name || source.original_filename || source.url || `#${source.id}`;
  const t = source.source_type.toLowerCase();

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 transition-colors",
        onClick
          ? "cursor-pointer hover:bg-white/[0.03]"
          : "hover:bg-white/[0.02]",
      )}
    >
      {onClick && (
        <button
          type="button"
          aria-label={`Open ${label}`}
          className="absolute inset-0 rounded-xl"
          onClick={onClick}
        />
      )}
      <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0">
          <SourceTypeIcon sourceType={source.source_type} size={14} />
        </div>
        {t === "color" && rd.hex && (
          <span
            className="inline-block h-4 w-4 shrink-0 rounded-full border border-zinc-800/70"
            style={{ background: rd.hex }}
          />
        )}
        <p className="text-sm text-foreground truncate flex-1">{label}</p>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(source.status)}
          <span className="hidden text-xs uppercase tracking-wide text-zinc-500 sm:inline">
            {source.source_type}
          </span>
          {t === "font" && rd.family && (
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {rd.family}
            </span>
          )}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="pointer-events-auto rounded-lg p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
              title="Remove resource"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddResourcePanel({ projectId }: Readonly<{ projectId: number }>) {
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
    { key: "upload", label: "Upload", icon: <Upload size={13} /> },
    { key: "url", label: "URL", icon: <Globe size={13} /> },
    { key: "color", label: "Color", icon: <Palette size={13} /> },
    { key: "font", label: "Font", icon: <Type size={13} /> },
    { key: "text", label: "Text", icon: <FileText size={13} /> },
  ];
  let fileErrorMessage: string | null = null;
  if (fileMutation.isError) {
    fileErrorMessage =
      fileMutation.error instanceof Error
        ? fileMutation.error.message
        : "Upload failed";
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/25 backdrop-blur-xl">
      <div className="flex border-b border-zinc-800/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
              activeTab === t.key
                ? "-mb-px border-b-2 border-zinc-50 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-100",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "upload" && (
          <UploadResourceField
            fileInputRef={fileInputRef}
            isPending={fileMutation.isPending}
            onFileSelect={(file) => fileMutation.mutate(file)}
            labelClassName="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-800/70 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
            errorMessage={fileErrorMessage}
          />
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
              Add
            </Button>
          </div>
        )}

        {activeTab === "color" && (
          <div className="flex flex-wrap gap-2">
            <Input
              type="text"
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              placeholder="Name (e.g. Primary)"
              className="flex-1 min-w-[120px]"
            />
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-2 py-1">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
              />
              <span className="font-mono text-xs text-zinc-500">
                {colorHex}
              </span>
            </div>
            <Input
              type="text"
              value={colorRole}
              onChange={(e) => setColorRole(e.target.value)}
              placeholder="Role (optional)"
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
              Add
            </Button>
          </div>
        )}

        {activeTab === "font" && (
          <div className="flex flex-wrap gap-2">
            <Input
              type="text"
              value={fontName}
              onChange={(e) => setFontName(e.target.value)}
              placeholder="Name (e.g. Display font)"
              className="flex-1 min-w-[140px]"
            />
            <Input
              type="text"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder="Family (e.g. Inter)"
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
              Add
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
                placeholder="Name (e.g. Tagline)"
                className="flex-1"
              />
              <select
                value={textKind}
                onChange={(e) => setTextKind(e.target.value)}
                className={`${DESIGN_BANK_INPUT_CLASSNAME} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="copy">Copy</option>
                <option value="tagline">Tagline</option>
                <option value="slogan">Slogan</option>
                <option value="voice_notes">Voice notes</option>
              </select>
            </div>
            <div className="flex gap-2">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write your brand copy here..."
                rows={2}
                className={`${DESIGN_BANK_INPUT_CLASSNAME} flex-1 resize-none disabled:cursor-not-allowed disabled:opacity-50`}
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
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectDesignBank({
  projectId,
}: Readonly<{ projectId: number }>) {
  const { isOwner, isEditor } = useAuth();
  const canEdit = isOwner || isEditor;
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const v = localStorage.getItem(DESIGN_BANK_PROJECT_VIEW_MODE_KEY);
      if (v === "grid" || v === "list") return v;
    } catch {
      /* ignore */
    }
    return "grid";
  });

  const setView = (mode: ViewMode) => {
    try {
      localStorage.setItem(DESIGN_BANK_PROJECT_VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
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
      const data = query.state.data;
      if (!Array.isArray(data)) return false;
      const hasTransient = data.some(
        (s) => s.status === "pending" || s.status === "processing",
      );
      return hasTransient ? DESIGN_BANK_POLL_MS : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSource(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["project-sources", projectId],
      }),
  });
  let resourceSummary = "No resources";
  if (sources && sources.length > 0) {
    const resourceLabel = sources.length === 1 ? "resource" : "resources";
    resourceSummary = `${sources.length} ${resourceLabel}`;
  }

  return (
    <div className="space-y-4">
      {canEdit && <AddResourcePanel projectId={projectId} />}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={14} className="animate-spin" />
          Loading resources...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load Design Bank.</p>
      )}

      {sources && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">{resourceSummary}</span>
            <div className="flex gap-0.5 overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-0.5">
              <button
                onClick={() => setView("grid")}
                title="Grid view"
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-zinc-50 text-zinc-900"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("list")}
                title="List view"
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-zinc-50 text-zinc-900"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {sources.length === 0 && (
            <p className="text-sm text-zinc-400">
              {canEdit
                ? "Add colors, fonts, images, and brand copy above."
                : "No resources yet."}
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
            <div className="overflow-hidden rounded-2xl border border-zinc-800/60 divide-y divide-zinc-800/60 bg-zinc-900/20">
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
