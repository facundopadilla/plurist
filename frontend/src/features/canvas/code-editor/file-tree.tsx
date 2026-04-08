import { FileCode2, FileText, Lock } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { VirtualFile } from "../types";

interface FileTreeProps {
  files: VirtualFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

function FileIcon({ file }: Readonly<{ file: VirtualFile }>) {
  if (file.language === "css") {
    return <FileText size={14} className="flex-shrink-0 text-blue-400" />;
  }
  return <FileCode2 size={14} className="flex-shrink-0 text-orange-400" />;
}

export function FileTree({
  files,
  activeFileId,
  onFileSelect,
}: Readonly<FileTreeProps>) {
  return (
    <div
      className="flex flex-col border-b border-zinc-800/60"
      role="tree"
      aria-label="Project files"
      data-testid="file-tree"
    >
      <div className="px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Files
        </span>
      </div>
      {files.map((file) => {
        const isActive = file.id === activeFileId;
        return (
          <button
            key={file.id}
            type="button"
            role="treeitem"
            aria-selected={isActive}
            onClick={() => onFileSelect(file.id)}
            data-testid={`file-tree-item-${file.id}`}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
              isActive
                ? "bg-white/[0.06] text-zinc-100"
                : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200",
            )}
          >
            <FileIcon file={file} />
            <span className="min-w-0 flex-1 truncate">{file.filename}</span>
            {file.readOnly && (
              <Lock
                size={10}
                className="flex-shrink-0 text-amber-500/70"
                aria-label="Read only — AI is generating"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
