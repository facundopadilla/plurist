import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark-dimmed.min.css";
import { X, Pencil, Save, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { patchSource, updateSourceContent, getSourceFileUrl } from "./api";
import {
  getHighlightLanguageForSourceType,
  isCodeLikeSourceType,
  isCodeSyntaxSourceType,
  isImageSourceType,
} from "./constants";
import { SourceTypeIcon } from "./resource-ui";
import type { DesignBankSource } from "./types";

function artifactKind(source: DesignBankSource | null): string {
  const rd: Record<string, unknown> = source?.resource_data ?? {};
  const value = rd.artifact_kind;
  return typeof value === "string" ? value : "";
}

function isManagedArtifact(source: DesignBankSource | null): boolean {
  const kind = artifactKind(source);
  return kind === "design_system" || kind === "reference_brief";
}

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
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readRecordString(
  record: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function readRecordStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] | null {
  const value = record[key];
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
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
}: Readonly<SourceDetailModalProps>) {
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
      const rd: Record<string, unknown> = source.resource_data ?? {};
      const ed: Record<string, unknown> = source.extracted_data ?? {};
      setEditName(source.name ?? "");
      setEditHex(readRecordString(rd, "hex") ?? "#000000");
      setEditRole(readRecordString(rd, "role") ?? "");
      setEditFamily(readRecordString(rd, "family") ?? "");
      setEditContent(readRecordString(rd, "content") ?? "");
      setEditKind(readRecordString(rd, "kind") ?? "copy");
      setEditMode(false);

      const srcType = source.source_type.toLowerCase();
      const isCodeType = isCodeLikeSourceType(srcType);
      if (isManagedArtifact(source)) {
        setCodeContent(readRecordString(rd, "content") ?? "");
      } else if (isCodeType && source.storage_key) {
        setCodeContent(readRecordString(ed, "text_snippet") ?? "");
        setCodeLoading(true);
        fetch(getSourceFileUrl(source.id), { credentials: "include" })
          .then((r) => r.text())
          .then((text) => {
            setCodeContent(text);
            setCodeLoading(false);
          })
          .catch(() => setCodeLoading(false));
      } else if (isCodeType) {
        setCodeContent(
          readRecordString(ed, "text_snippet") ??
            readRecordString(rd, "content") ??
            "",
        );
      }
    }
  }, [source]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!source) throw new Error("No source");
      const t = source.source_type.toLowerCase();
      let resource_data: Record<string, unknown> | undefined;
      const managedArtifact = isManagedArtifact(source);

      const isCodeType = isCodeLikeSourceType(t);

      if (t === "color") {
        resource_data = { hex: editHex, role: editRole };
      } else if (t === "font") {
        const rd: Record<string, unknown> = source.resource_data ?? {};
        resource_data = { ...rd, family: editFamily };
      } else if (t === "text") {
        resource_data = { content: editContent, kind: editKind };
      } else if (managedArtifact) {
        const rd: Record<string, unknown> = source.resource_data ?? {};
        resource_data = {
          ...rd,
          content: codeContent,
          edited_after_generation: true,
          last_edited_at: new Date().toISOString(),
        };
      }

      const patchPromise = patchSource(source.id, {
        name: editName || undefined,
        ...(resource_data ? { resource_data } : {}),
      });

      if (isCodeType && source.storage_key && !managedArtifact) {
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
    const srcType = source?.source_type.toLowerCase() ?? "";
    const lang = getHighlightLanguageForSourceType(srcType);
    if (!lang) return "";
    try {
      return hljs.highlight(codeContent, { language: lang }).value;
    } catch {
      return codeContent;
    }
  }, [codeContent, source?.source_type]);

  if (!open || !source) return null;

  const t = source.source_type.toLowerCase();
  const rd: Record<string, unknown> = source.resource_data ?? {};
  const label =
    source.name ||
    source.original_filename ||
    source.url ||
    `Source #${source.id}`;
  const isImage = isImageSourceType(t);
  const isCode = isCodeSyntaxSourceType(t);
  const managedArtifact = isManagedArtifact(source);
  const hasFile = Boolean(source.storage_key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <button
        type="button"
        aria-label="Close source detail modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800/70 bg-zinc-950/95 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800/60 px-5 py-4">
          <span className="shrink-0">
            <SourceTypeIcon sourceType={t} size={18} />
          </span>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm font-medium text-zinc-100 outline-none focus:ring-2 focus:ring-white/[0.04]"
              />
            ) : (
              <h2 className="truncate font-semibold text-zinc-50">{label}</h2>
            )}
            <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
              {source.source_type}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editMode ? (
              <>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {saveMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-xl border border-zinc-800/70 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800/70 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
            {canDelete && !editMode && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteRequest?.();
                }}
                title="Delete resource"
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image preview */}
          {isImage && hasFile && source.status === "ready" && (
            <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-900/60">
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
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800/70 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
            >
              <ExternalLink size={14} />
              Open / Download PDF
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
                  className="h-16 w-16 cursor-pointer rounded-xl border border-zinc-800/70"
                />
              ) : (
                <div
                  className="h-16 w-16 shrink-0 rounded-xl border border-zinc-800/70 shadow-sm"
                  style={{ background: readRecordString(rd, "hex", "#000000") }}
                />
              )}
              <div className="space-y-2">
                {editMode ? (
                  <>
                    <input
                      type="text"
                      value={editHex}
                      onChange={(e) => setEditHex(e.target.value)}
                      className="block w-28 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm font-mono text-zinc-100 outline-none focus:ring-2 focus:ring-white/[0.04]"
                    />
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      placeholder="Role (e.g. primary, secondary)"
                      className="block w-48 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-white/[0.04]"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xl font-mono font-medium">
                      {readRecordString(rd, "hex")}
                    </p>
                    {readRecordString(rd, "role") !== "" && (
                      <p className="text-sm text-zinc-400">
                        {readRecordString(rd, "role")}
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
              <div className="space-y-2 rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-4">
                <p
                  style={{ fontFamily: readRecordString(rd, "family") }}
                  className="text-2xl"
                >
                  The quick brown fox jumps over the lazy dog
                </p>
                <p
                  style={{ fontFamily: readRecordString(rd, "family") }}
                  className="text-sm text-zinc-400"
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
                  placeholder="CSS family (e.g. Inter, Roboto)"
                  className="w-full rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-white/[0.04]"
                />
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-zinc-400">
                    Family:{" "}
                    <span className="font-mono text-foreground">
                      {readRecordString(rd, "family")}
                    </span>
                  </p>
                  {rd.weights !== undefined && (
                    <p className="text-sm text-zinc-400">
                      Weights:{" "}
                      {readRecordStringArray(rd, "weights")?.join(", ") ??
                        readRecordString(rd, "weights")}
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
                    className="rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="copy">Copy</option>
                    <option value="tagline">Tagline</option>
                    <option value="slogan">Slogan</option>
                    <option value="voice_notes">Voice notes</option>
                  </select>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="flex w-full resize-y rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 shadow-none transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </>
              ) : (
                <>
                  {readRecordString(rd, "kind") !== "" && (
                    <span className="inline-block rounded-lg border border-zinc-800/70 bg-zinc-900/70 px-2 py-0.5 text-xs text-zinc-400">
                      {readRecordString(rd, "kind")}
                    </span>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {readRecordString(rd, "content")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Code (html, css, js, markdown, generated artifacts) */}
          {(isCode || managedArtifact || t === "design_system") && (
            <div className="space-y-2">
              {codeLoading && (
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Loader2 size={12} className="animate-spin" /> Loading
                  content...
                </p>
              )}
              {editMode ? (
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  rows={16}
                  spellCheck={false}
                  className="w-full resize-y rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:ring-2 focus:ring-white/[0.04]"
                />
              ) : (
                <div className="max-h-72 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/80">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words hljs">
                    {highlightedCode ? (
                      <code
                        dangerouslySetInnerHTML={{ __html: highlightedCode }} // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- highlight.js output is escaped, not raw user HTML
                      />
                    ) : (
                      <code className="text-zinc-500">
                        No content available
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
              className="inline-flex items-center gap-2 break-all rounded-xl border border-zinc-800/70 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
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
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800/70 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
            >
              <ExternalLink size={14} />
              Download file
            </a>
          )}

          {saveMutation.isError && (
            <p className="text-xs text-red-500">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Failed to save changes"}
            </p>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-zinc-800/60 pt-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Uploaded
              </p>
              <p className="mt-0.5 text-sm text-zinc-100">
                {formatDate(source.created_at)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Updated
              </p>
              <p className="mt-0.5 text-sm text-zinc-100">
                {formatDate(source.updated_at)}
              </p>
            </div>
            {source.file_size_bytes != null && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Size
                </p>
                <p className="mt-0.5 text-sm text-zinc-100">
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
