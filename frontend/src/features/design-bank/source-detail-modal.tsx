import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark-dimmed.min.css";
import {
  X,
  Pencil,
  Save,
  ImageIcon,
  FileText,
  Palette,
  Type,
  AlignLeft,
  Code,
  Paintbrush,
  Braces,
  FileCode,
  Globe,
  File,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import { patchSource, updateSourceContent, getSourceFileUrl } from "./api";
import type { DesignBankSource } from "./types";

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value % 1 === 0 ? value : value.toFixed(2)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceTypeIcon(sourceType: string, size = 18) {
  const t = sourceType.toLowerCase();
  if (["image", "jpg", "jpeg", "png", "gif", "svg", "webp", "logo"].includes(t))
    return <ImageIcon size={size} className="text-muted-foreground" />;
  if (t === "pdf") return <FileText size={size} className="text-red-500" />;
  if (t === "color")
    return <Palette size={size} className="text-muted-foreground" />;
  if (t === "font")
    return <Type size={size} className="text-muted-foreground" />;
  if (t === "text")
    return <AlignLeft size={size} className="text-muted-foreground" />;
  if (t === "html")
    return <Code size={size} className="text-muted-foreground" />;
  if (["css", "design_system"].includes(t))
    return <Paintbrush size={size} className="text-muted-foreground" />;
  if (["js", "javascript"].includes(t))
    return <Braces size={size} className="text-muted-foreground" />;
  if (t === "markdown")
    return <FileCode size={size} className="text-muted-foreground" />;
  if (t === "url")
    return <Globe size={size} className="text-muted-foreground" />;
  return <File size={size} className="text-muted-foreground" />;
}

interface SourceDetailModalProps {
  source: DesignBankSource | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleteRequest?: () => void;
  canDelete?: boolean;
}

export function SourceDetailModal({
  source,
  open,
  onClose,
  onSaved,
  onDeleteRequest,
  canDelete = false,
}: SourceDetailModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editHex, setEditHex] = useState("#000000");
  const [editRole, setEditRole] = useState("");
  const [editFamily, setEditFamily] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editKind, setEditKind] = useState("copy");
  const [codeContent, setCodeContent] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    if (source) {
      const rd = (source.resource_data ?? {}) as Record<string, string>;
      const ed = (source.extracted_data ?? {}) as Record<string, string>;
      setEditName(source.name || "");
      setEditHex(rd.hex || "#000000");
      setEditRole(rd.role || "");
      setEditFamily(rd.family || "");
      setEditContent(rd.content || "");
      setEditKind(rd.kind || "copy");
      setEditMode(false);

      const srcType = source.source_type.toLowerCase();
      const isCodeType = [
        "html",
        "css",
        "js",
        "javascript",
        "markdown",
      ].includes(srcType);
      if (isCodeType && source.storage_key) {
        setCodeContent(ed.text_snippet || "");
        setCodeLoading(true);
        fetch(getSourceFileUrl(source.id), { credentials: "include" })
          .then((r) => r.text())
          .then((text) => {
            setCodeContent(text);
            setCodeLoading(false);
          })
          .catch(() => setCodeLoading(false));
      } else if (isCodeType) {
        setCodeContent(ed.text_snippet || rd.content || "");
      }
    }
  }, [source]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!source) throw new Error("No source");
      const t = source.source_type.toLowerCase();
      let resource_data: Record<string, unknown> | undefined;

      const isCodeType = [
        "html",
        "css",
        "js",
        "javascript",
        "markdown",
      ].includes(t);

      if (t === "color") {
        resource_data = { hex: editHex, role: editRole };
      } else if (t === "font") {
        const rd = (source.resource_data ?? {}) as Record<string, unknown>;
        resource_data = { ...rd, family: editFamily };
      } else if (t === "text") {
        resource_data = { content: editContent, kind: editKind };
      }

      const patchPromise = patchSource(source.id, {
        name: editName || undefined,
        ...(resource_data ? { resource_data } : {}),
      });

      if (isCodeType && source.storage_key) {
        return patchPromise.then(() =>
          updateSourceContent(source.id, codeContent),
        );
      }

      return patchPromise;
    },
    onSuccess: () => {
      setEditMode(false);
      onSaved();
    },
  });

  const highlightedCode = useMemo(() => {
    if (!codeContent) return "";
    const langMap: Record<string, string> = {
      html: "xml",
      css: "css",
      js: "javascript",
      javascript: "javascript",
      markdown: "markdown",
    };
    const srcType = source?.source_type.toLowerCase() ?? "";
    const lang = langMap[srcType];
    if (!lang) return "";
    try {
      return hljs.highlight(codeContent, { language: lang }).value;
    } catch {
      return codeContent;
    }
  }, [codeContent, source?.source_type]);

  if (!open || !source) return null;

  const t = source.source_type.toLowerCase();
  const rd = (source.resource_data ?? {}) as Record<string, unknown>;
  const label =
    source.name ||
    source.original_filename ||
    source.url ||
    `Source #${source.id}`;
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
  const isCode = ["html", "css", "js", "javascript", "markdown"].includes(t);
  const hasFile = Boolean(source.storage_key);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <span className="shrink-0">{sourceTypeIcon(t)}</span>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-[10px] border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            ) : (
              <h2 className="font-semibold text-foreground truncate">
                {label}
              </h2>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
              {source.source_type}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editMode ? (
              <>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-[14px] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Guardar
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                <Pencil size={12} />
                Editar
              </button>
            )}
            {canDelete && !editMode && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteRequest?.();
                }}
                title="Eliminar recurso"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image preview */}
          {isImage && hasFile && source.status === "ready" && (
            <div className="rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center min-h-[200px]">
              <img
                src={getSourceFileUrl(source.id)}
                alt={label}
                className="max-w-full max-h-96 object-contain"
              />
            </div>
          )}

          {/* PDF */}
          {t === "pdf" && hasFile && (
            <a
              href={getSourceFileUrl(source.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <ExternalLink size={14} />
              Abrir / Descargar PDF
            </a>
          )}

          {/* Color */}
          {t === "color" && (
            <div className="flex items-center gap-5">
              {editMode ? (
                <input
                  type="color"
                  value={editHex}
                  onChange={(e) => setEditHex(e.target.value)}
                  className="h-16 w-16 cursor-pointer rounded-xl border border-border"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-xl border border-border shadow-sm shrink-0"
                  style={{ background: String(rd.hex ?? "#000000") }}
                />
              )}
              <div className="space-y-2">
                {editMode ? (
                  <>
                    <input
                      type="text"
                      value={editHex}
                      onChange={(e) => setEditHex(e.target.value)}
                      className="block rounded-[10px] border border-input bg-background px-2 py-1 text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    />
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      placeholder="Rol (ej. primary, secondary)"
                      className="block rounded-[10px] border border-input bg-background px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xl font-mono font-medium">
                      {String(rd.hex ?? "")}
                    </p>
                    {!!rd.role && (
                      <p className="text-sm text-muted-foreground">
                        {String(rd.role)}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Font */}
          {t === "font" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <p
                  style={{ fontFamily: String(rd.family ?? "") }}
                  className="text-2xl"
                >
                  The quick brown fox jumps over the lazy dog
                </p>
                <p
                  style={{ fontFamily: String(rd.family ?? "") }}
                  className="text-sm text-muted-foreground"
                >
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
                  0123456789
                </p>
              </div>
              {editMode ? (
                <input
                  type="text"
                  value={editFamily}
                  onChange={(e) => setEditFamily(e.target.value)}
                  placeholder="Familia CSS (ej. Inter, Roboto)"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Family:{" "}
                    <span className="font-mono text-foreground">
                      {String(rd.family ?? "")}
                    </span>
                  </p>
                  {!!rd.weights && (
                    <p className="text-sm text-muted-foreground">
                      Weights:{" "}
                      {Array.isArray(rd.weights)
                        ? rd.weights.join(", ")
                        : String(rd.weights)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Text */}
          {t === "text" && (
            <div className="space-y-2">
              {editMode ? (
                <>
                  <select
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="copy">Copy</option>
                    <option value="tagline">Tagline</option>
                    <option value="slogan">Slogan</option>
                    <option value="voice_notes">Notas de voz</option>
                  </select>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  />
                </>
              ) : (
                <>
                  {!!rd.kind && (
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {String(rd.kind)}
                    </span>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {String(rd.content ?? "")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Code (html, css, js, markdown) */}
          {isCode && (
            <div className="space-y-2">
              {codeLoading && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Cargando
                  contenido...
                </p>
              )}
              {editMode ? (
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  rows={16}
                  spellCheck={false}
                  className="w-full rounded-[14px] border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/15 resize-y"
                />
              ) : (
                <div className="rounded-lg border border-border overflow-auto max-h-72">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words hljs">
                    {highlightedCode ? (
                      <code
                        dangerouslySetInnerHTML={{ __html: highlightedCode }}
                      />
                    ) : (
                      <code className="text-muted-foreground">
                        Sin contenido disponible
                      </code>
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* URL */}
          {t === "url" && source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-primary hover:bg-accent transition-colors break-all"
            >
              <ExternalLink size={14} className="shrink-0" />
              {source.url}
            </a>
          )}

          {/* Generic upload */}
          {t === "upload" && hasFile && (
            <a
              href={getSourceFileUrl(source.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <ExternalLink size={14} />
              Descargar archivo
            </a>
          )}

          {saveMutation.isError && (
            <p className="text-xs text-red-500">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Error al guardar"}
            </p>
          )}

          {/* Metadata */}
          <div className="border-t border-border pt-4 grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Subido
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {formatDate(source.created_at)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Modificado
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {formatDate(source.updated_at)}
              </p>
            </div>
            {source.file_size_bytes != null && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tamaño
                </p>
                <p className="mt-0.5 text-sm text-foreground">
                  {formatFileSize(source.file_size_bytes)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
