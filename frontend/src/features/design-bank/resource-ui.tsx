import type { RefObject } from "react";
import {
  AlignLeft,
  Braces,
  Code,
  File as FileIcon,
  FileCode,
  FileText,
  Globe,
  ImageIcon,
  Loader2,
  Paintbrush,
  Palette,
  Type,
  Upload,
} from "lucide-react";

const IMAGE_SOURCE_TYPES = new Set([
  "image",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "logo",
]);

const DESIGN_SOURCE_TYPES = new Set(["css", "design_system"]);
const SCRIPT_SOURCE_TYPES = new Set(["js", "javascript"]);

export const DESIGN_BANK_INPUT_CLASSNAME =
  "flex w-full rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 shadow-none transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.04]";

export function SourceTypeIcon({
  sourceType,
  size = 16,
}: Readonly<{
  sourceType: string;
  size?: number;
}>) {
  const type = sourceType.toLowerCase();

  if (IMAGE_SOURCE_TYPES.has(type)) {
    return <ImageIcon size={size} className="text-zinc-500" />;
  }
  if (type === "pdf") {
    return <FileText size={size} className="text-red-500" />;
  }
  if (type === "color") {
    return <Palette size={size} className="text-zinc-500" />;
  }
  if (type === "font") {
    return <Type size={size} className="text-zinc-500" />;
  }
  if (type === "text") {
    return <AlignLeft size={size} className="text-zinc-500" />;
  }
  if (type === "html") {
    return <Code size={size} className="text-zinc-500" />;
  }
  if (DESIGN_SOURCE_TYPES.has(type)) {
    return <Paintbrush size={size} className="text-zinc-500" />;
  }
  if (SCRIPT_SOURCE_TYPES.has(type)) {
    return <Braces size={size} className="text-zinc-500" />;
  }
  if (type === "markdown") {
    return <FileCode size={size} className="text-zinc-500" />;
  }
  if (type === "url") {
    return <Globe size={size} className="text-zinc-500" />;
  }

  return <FileIcon size={size} className="text-zinc-500" />;
}

export function UploadResourceField({
  fileInputRef,
  isPending,
  onFileSelect,
  labelClassName,
  errorMessage,
  successMessage,
}: Readonly<{
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  onFileSelect: (file: File) => void;
  labelClassName?: string;
  errorMessage?: string | null;
  successMessage?: string | null;
}>) {
  const resolvedLabelClassName =
    labelClassName ??
    "flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-800/70 px-3 py-4 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100";

  return (
    <div>
      <label className={resolvedLabelClassName}>
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {isPending ? "Uploading..." : "Choose a file (image, PDF, and more)"}
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          disabled={isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFileSelect(file);
            }
          }}
        />
      </label>
      {errorMessage ? (
        <p className="mt-1 text-xs text-destructive">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-1 text-xs text-green-600">{successMessage}</p>
      ) : null}
    </div>
  );
}
