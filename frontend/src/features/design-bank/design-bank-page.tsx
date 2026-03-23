import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Link,
  FileText,
  Image,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
} from "lucide-react";
import { useAuth } from "../auth/use-auth";
import { fetchSources, uploadFile, ingestUrl } from "./api";
import type { DesignBankSource } from "./types";

const REFERENCE_ONLY_TYPES = ["html", "css", "js", "javascript"];

function isReferenceOnly(source: DesignBankSource): boolean {
  const t = source.source_type.toLowerCase();
  return REFERENCE_ONLY_TYPES.includes(t);
}

function SourceTypeIcon({ sourceType }: { sourceType: string }) {
  const t = sourceType.toLowerCase();
  if (t === "url") return <Globe size={16} className="text-muted-foreground" />;
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "image"].includes(t))
    return <Image size={16} className="text-muted-foreground" />;
  return <FileText size={16} className="text-muted-foreground" />;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return (
        <span
          data-testid="design-bank-source-status"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
        >
          <CheckCircle size={11} />
          ready
        </span>
      );
    case "processing":
      return (
        <span
          data-testid="design-bank-source-status"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
        >
          <Loader2 size={11} className="animate-spin" />
          processing
        </span>
      );
    case "failed":
      return (
        <span
          data-testid="design-bank-source-status"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        >
          <XCircle size={11} />
          failed
        </span>
      );
    default:
      return (
        <span
          data-testid="design-bank-source-status"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          pending
        </span>
      );
  }
}

function SourceCard({ source }: { source: DesignBankSource }) {
  const label = source.original_filename || source.url || `Source #${source.id}`;
  const referenceOnly = isReferenceOnly(source);

  return (
    <div
      data-testid="design-bank-source-card"
      className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="mt-0.5">
        <SourceTypeIcon sourceType={source.source_type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={label}>
          {label}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={source.status} />
          {referenceOnly && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
              Reference only
            </span>
          )}
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {source.source_type}
          </span>
        </div>
        {source.status === "failed" && source.error_message && (
          <p className="mt-1 text-xs text-red-500">{source.error_message}</p>
        )}
      </div>
    </div>
  );
}

function UploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["design-bank-sources"] });
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: Error) => {
      setFileError(err.message);
    },
  });

  const urlMutation = useMutation({
    mutationFn: ingestUrl,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["design-bank-sources"] });
      setUrlValue("");
      setUrlError(null);
    },
    onError: (err: Error) => {
      setUrlError(err.message);
    },
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    fileMutation.mutate(file);
  }

  function handleUrlSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    urlMutation.mutate(trimmed);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Add sources</h2>

      {/* File upload */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Upload file</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">
          {fileMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          <span>{fileMutation.isPending ? "Uploading…" : "Choose a file to upload"}</span>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            data-testid="design-bank-upload-file"
            disabled={fileMutation.isPending}
            onChange={handleFileChange}
          />
        </label>
        {fileError && <p className="text-xs text-red-500">{fileError}</p>}
        {fileMutation.isSuccess && (
          <p className="text-xs text-green-600">File uploaded successfully.</p>
        )}
      </div>

      {/* URL ingestion */}
      <form onSubmit={handleUrlSubmit} className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Ingest from URL</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/design-reference"
              data-testid="design-bank-upload-url"
              disabled={urlMutation.isPending}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={urlMutation.isPending || !urlValue.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {urlMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Add"}
          </button>
        </div>
        {urlError && <p className="text-xs text-red-500">{urlError}</p>}
        {urlMutation.isSuccess && (
          <p className="text-xs text-green-600">URL queued for ingestion.</p>
        )}
      </form>
    </div>
  );
}

export function DesignBankPage() {
  const { isOwner, isEditor } = useAuth();
  const canUpload = isOwner || isEditor;

  const { data: sources, isLoading, isError } = useQuery({
    queryKey: ["design-bank-sources"],
    queryFn: fetchSources,
    // Poll while any source is in a transient state
    refetchInterval: (query) => {
      const data = query.state.data as DesignBankSource[] | undefined;
      if (!data) return false;
      const hasTransient = data.some(
        (s) => s.status === "pending" || s.status === "processing",
      );
      return hasTransient ? 3000 : false;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Design Bank</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage design references and source assets.
        </p>
      </div>

      {canUpload && <UploadSection />}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Sources
          {sources && (
            <span className="ml-2 font-normal text-muted-foreground">({sources.length})</span>
          )}
        </h2>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Loading sources…
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500">Failed to load sources. Please refresh the page.</p>
        )}

        {sources && sources.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No sources yet.{canUpload ? " Upload a file or add a URL above." : ""}
          </p>
        )}

        {sources && sources.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
