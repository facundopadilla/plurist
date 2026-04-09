/* eslint-disable react-refresh/only-export-components */
import {
  FileUp,
  FolderOpen,
  ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Type,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getSourceFileUrl } from "../design-bank/api";
import { isImageSourceType } from "../design-bank/constants";

export { isImageSourceType };
import type { DesignBankSource } from "../design-bank/types";
import type { Project } from "../projects/types";

export type MutableRef<T> = { current: T };

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type PromptContextOrigin = "upload" | "design-bank";

export interface PromptContextAttachment {
  id: string;
  sourceId?: number;
  name: string;
  sourceType: string;
  description: string;
  origin: PromptContextOrigin;
  url?: string;
}

export function summarizeSource(source: DesignBankSource) {
  const resourceData = Object.entries(source.resource_data ?? {})
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
  const extractedData = Object.entries(source.extracted_data ?? {})
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");

  return [
    source.original_filename ? `file: ${source.original_filename}` : null,
    source.url ? `source: ${source.url}` : null,
    resourceData || null,
    extractedData || null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function createPromptContextAttachment(
  source: DesignBankSource,
  origin: PromptContextOrigin,
): PromptContextAttachment {
  return {
    id: `${origin}-${source.id}`,
    sourceId: source.id,
    name: source.name || source.original_filename || `Source #${source.id}`,
    sourceType: source.source_type,
    description: summarizeSource(source),
    origin,
    url:
      source.storage_key && isImageSourceType(source.source_type)
        ? getSourceFileUrl(source.id)
        : source.url || undefined,
  };
}

export function attachmentOriginLabel(origin: PromptContextOrigin) {
  return origin === "upload" ? "Uploaded" : "Design Bank";
}

export function attachmentIcon(sourceType: string) {
  return isImageSourceType(sourceType) ? (
    <ImageIcon size={12} />
  ) : (
    <Type size={12} />
  );
}

export function projectTriggerLabel(
  projects: Project[],
  projectId: number | null,
) {
  const project = projects.find((entry) => entry.id === projectId);
  return project ? project.name : "Project";
}

export function filterPromptContextSources(
  sources: DesignBankSource[],
  search: string,
): DesignBankSource[] {
  const query = search.trim().toLowerCase();
  if (!query) return sources;

  return sources.filter((source) => {
    const haystack = [
      source.name,
      source.original_filename,
      source.source_type,
      source.url,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function togglePromptContextSpeechRecognition(params: {
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
  isListening: boolean;
  supportsSpeechRecognition: boolean;
  setSpeechError: (value: string | null) => void;
  setIsListening: (value: boolean) => void;
  setText: Dispatch<SetStateAction<string>>;
}): void {
  params.setSpeechError(null);
  if (!params.supportsSpeechRecognition) {
    params.setSpeechError("Speech to text is not available in this browser.");
    return;
  }

  if (params.isListening) {
    params.recognitionRef.current?.stop();
    return;
  }

  const host = globalThis as Record<string, unknown>;
  const Recognition = (host.SpeechRecognition ??
    host.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;
  if (!Recognition) return;

  const recognition = new Recognition();
  recognition.lang = navigator.language ?? "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .slice(event.resultIndex)
      .filter((result) => result.isFinal)
      .map((result) => result[0]?.transcript ?? "")
      .join(" ")
      .trim();

    if (!transcript) return;

    params.setText((previous) => {
      const trimmedPrevious = previous.trimEnd();
      return trimmedPrevious ? `${trimmedPrevious} ${transcript}` : transcript;
    });
  };
  recognition.onerror = (event) => {
    params.setSpeechError(event.error ?? "Speech to text failed.");
    params.setIsListening(false);
  };
  recognition.onend = () => {
    params.setIsListening(false);
    params.recognitionRef.current = null;
  };

  params.recognitionRef.current = recognition;
  params.setIsListening(true);
  recognition.start();
}

export function PromptContextToolbarLeft({
  canOpenAttachmentActions,
  uploadPending,
  onUploadFromComputer,
  onOpenDesignBank,
  projects,
  projectId,
  onProjectChange,
}: Readonly<{
  canOpenAttachmentActions: boolean;
  uploadPending: boolean;
  onUploadFromComputer: () => void;
  onOpenDesignBank: () => void;
  projects: Project[];
  projectId: number | null;
  onProjectChange: (projectId: number | null) => void;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/70 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50"
            aria-label="Add prompt context"
          >
            <Plus size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Add context</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onUploadFromComputer}
            disabled={!canOpenAttachmentActions || uploadPending}
          >
            <FileUp size={14} />
            <span>
              {uploadPending ? "Uploading..." : "Upload from computer"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onOpenDesignBank}
            disabled={!canOpenAttachmentActions}
          >
            <Paperclip size={14} />
            <span>Import from Design Bank</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 max-w-[160px] items-center gap-2 rounded-md border border-zinc-800/70 bg-zinc-900/70 px-2.5 text-xs text-zinc-200 transition-colors hover:border-zinc-700 hover:text-zinc-50"
          >
            <FolderOpen size={13} className="text-zinc-500" />
            <span className="truncate">
              {projectTriggerLabel(projects, projectId)}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 max-h-72 overflow-y-auto"
        >
          <DropdownMenuLabel>Select project</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onProjectChange(null)}>
            <FolderOpen size={14} />
            <span>No project</span>
          </DropdownMenuItem>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onSelect={() => onProjectChange(project.id)}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: project.color ?? "#6366f1" }}
              />
              <span className="truncate">{project.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PromptContextDesignBankDialog({
  open,
  onOpenChange,
  selectedProjectName,
  attachmentsCount,
  search,
  setSearch,
  projectId,
  isLoading,
  filteredSources,
  attachments,
  onAttachSource,
  showSourceStatus = false,
  showDoneButton = false,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProjectName: string | null;
  attachmentsCount: number;
  search: string;
  setSearch: (value: string) => void;
  projectId: number | null;
  isLoading: boolean;
  filteredSources: DesignBankSource[];
  attachments: Array<{ sourceId?: number }>;
  onAttachSource: (source: DesignBankSource) => void;
  showSourceStatus?: boolean;
  showDoneButton?: boolean;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-zinc-800/70 bg-zinc-950 p-0 text-zinc-50 shadow-xl">
        <DialogHeader className="border-b border-zinc-800/70 px-5 py-4 text-left">
          <DialogTitle className="text-sm font-semibold">
            Import from Design Bank
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Attach project assets as prompt context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="truncate">
              {selectedProjectName
                ? `Browsing ${selectedProjectName}`
                : "No project selected"}
            </span>
            <span>{attachmentsCount} attached</span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets..."
              className="border-zinc-800/70 bg-zinc-950/80 pl-9 text-zinc-100"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-md border border-zinc-800/70">
            {projectId === null && (
              <div className="px-4 py-6 text-sm text-zinc-500">
                Select a project first.
              </div>
            )}

            {projectId !== null && isLoading && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-400">
                <Loader2 size={14} className="animate-spin" />
                Loading assets...
              </div>
            )}

            {projectId !== null &&
              !isLoading &&
              filteredSources.length === 0 && (
                <div className="px-4 py-6 text-sm text-zinc-500">
                  No assets found for this project.
                </div>
              )}

            {filteredSources.map((source) => {
              const alreadyAttached = attachments.some(
                (entry) => entry.sourceId === source.id,
              );

              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onAttachSource(source)}
                  disabled={alreadyAttached}
                  className="flex w-full items-start justify-between gap-3 border-b border-zinc-900 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-100">
                      {attachmentIcon(source.source_type)}
                      {isImageSourceType(source.source_type) &&
                      source.storage_key ? (
                        <img
                          src={getSourceFileUrl(source.id)}
                          alt={
                            source.name ||
                            source.original_filename ||
                            `Source #${source.id}`
                          }
                          className="h-9 w-9 rounded-md border border-zinc-800/70 object-cover"
                        />
                      ) : null}
                      <span className="truncate">
                        {source.name ||
                          source.original_filename ||
                          `Source #${source.id}`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {source.source_type}
                      {source.original_filename
                        ? ` • ${source.original_filename}`
                        : ""}
                    </p>
                    {showSourceStatus && source.status ? (
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Status: {source.status}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {alreadyAttached ? "Attached" : "Attach"}
                  </span>
                </button>
              );
            })}
          </div>

          {showDoneButton ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-md px-3 text-xs text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-50"
              >
                Done
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
