import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileUp,
  FolderOpen,
  ImageIcon,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Search,
  Send,
  Type,
  X,
} from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import { useCanvasStore } from "../canvas-store";
import { useChatStream } from "./use-chat-stream";
import { useChatToCanvas } from "../hooks/use-chat-to-canvas";
import { ModelDropdown } from "../header-dropdowns";
import { cn } from "../../../lib/utils";
import type { ChatMessage } from "../types";
import { ChatMessageBubble } from "./chat-message";
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
import {
  fetchProjectSources,
  getSourceFileUrl,
  uploadFile,
} from "../../design-bank/api";
import type { DesignBankSource } from "../../design-bank/types";
import { fetchProjects } from "../../projects/api";
import type { Project } from "../../projects/types";

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

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface ChatAttachment {
  id: string;
  sourceId?: number;
  name: string;
  sourceType: string;
  description: string;
  origin: "upload" | "design-bank";
  url?: string;
}

function summarizeSource(source: DesignBankSource) {
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

function isImageSourceType(sourceType: string) {
  return ["image", "jpg", "jpeg", "png", "gif", "svg", "webp", "logo"].includes(
    sourceType.toLowerCase(),
  );
}

function createAttachmentFromSource(
  source: DesignBankSource,
  origin: ChatAttachment["origin"],
): ChatAttachment {
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

function attachmentOriginLabel(origin: ChatAttachment["origin"]) {
  return origin === "upload" ? "Uploaded" : "Design Bank";
}

function attachmentIcon(sourceType: string) {
  return isImageSourceType(sourceType) ? (
    <ImageIcon size={12} />
  ) : (
    <Type size={12} />
  );
}

function projectTriggerLabel(projects: Project[], projectId: number | null) {
  const project = projects.find((entry) => entry.id === projectId);
  return project ? project.name : "Project";
}

function buildPromptWithAttachments(
  input: string,
  attachments: ChatAttachment[],
) {
  const trimmedInput = input.trim();
  if (attachments.length === 0) return trimmedInput;

  const attachmentContext = attachments
    .map(
      (attachment, index) =>
        `${index + 1}. ${attachment.name} [${attachment.sourceType}]${attachment.url ? ` URL: ${attachment.url}` : ""}${attachment.description ? ` Notes: ${attachment.description}` : ""}`,
    )
    .join("\n");

  return `${trimmedInput}\n\nReference context from attachments:\n${attachmentContext}`.trim();
}

function containsHtmlLikeContent(content: string): boolean {
  return /<(html|body|div|section|p|h[1-6]|style|svg|figure)\b/i.test(content);
}

import { useActiveProvider } from "../use-active-provider";

export function ChatSidebar() {
  const messages = useCanvasStore((s) => s.messages);
  const isStreaming = useCanvasStore((s) => s.isStreaming);
  const addMessage = useCanvasStore((s) => s.addMessage);
  const updateLastMessage = useCanvasStore((s) => s.updateLastMessage);
  const setIsStreaming = useCanvasStore((s) => s.setIsStreaming);
  const config = useCanvasStore((s) => s.config);
  const setConfig = useCanvasStore((s) => s.setConfig);
  const conversationId = useCanvasStore((s) => s.conversationId);
  const chatMode = useCanvasStore((s) => s.chatMode);
  const setChatMode = useCanvasStore((s) => s.setChatMode);

  const { activeProvider } = useActiveProvider();

  const { sendMessage } = useChatStream();
  const { onHtmlBlock } = useChatToCanvas();

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDesignBankOpen, setIsDesignBankOpen] = useState(false);
  const [designBankSearch, setDesignBankSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const { data: designBankSources = [], isLoading: isLoadingDesignBank } =
    useQuery({
      queryKey: ["project-sources", config.projectId],
      queryFn: () => fetchProjectSources(config.projectId as number),
      enabled: isDesignBankOpen && config.projectId !== null,
    });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, config.projectId ?? undefined),
    onSuccess: (source) => {
      const attachment = createAttachmentFromSource(source, "upload");
      setAttachments((prev) =>
        prev.some((entry) => entry.id === attachment.id)
          ? prev
          : [...prev, attachment],
      );
    },
  });

  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === config.projectId) ?? null,
    [projects, config.projectId],
  );

  const filteredDesignBankSources = useMemo(() => {
    const query = designBankSearch.trim().toLowerCase();
    if (!query) return designBankSources;

    return designBankSources.filter((source) => {
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
  }, [designBankSearch, designBankSources]);

  const supportsSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = buildPromptWithAttachments(input, attachments);
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      htmlBlocks: [],
      createdAt: new Date(),
    };
    addMessage(userMsg);
    setInput("");
    setAttachments([]);
    setSpeechError(null);

    const provider = activeProvider ?? "openai";
    const modelId = config.selectedModels?.[provider] ?? null;

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      htmlBlocks: [],
      isStreaming: true,
      createdAt: new Date(),
      provider,
      modelId: modelId ?? undefined,
    };
    addMessage(assistantMsg);
    setIsStreaming(true);
    contentRef.current = "";

    const storeMessages = useCanvasStore.getState().messages;
    const apiMessages = storeMessages
      .filter((m) => {
        if (m.role === "user") return true;
        if (m.role !== "assistant" || !m.content) return false;

        if (chatMode === "plan") {
          if (m.htmlBlocks.length > 0) return false;
          if (containsHtmlLikeContent(m.content)) return false;
        }

        return true;
      })
      .map((m) => ({ role: m.role, content: m.content }));

    void sendMessage(
      {
        conversationId,
        messages: apiMessages,
        provider,
        modelId,
        projectId: config.projectId,
        formatKey: config.formatKey,
        network: config.network,
        mode: chatMode,
      },
      {
        onToken: (token) => {
          contentRef.current += token;
          updateLastMessage({ content: contentRef.current });
        },
        onHtmlBlock: (slideIndex, html) => {
          onHtmlBlock(slideIndex, html, provider);
          updateLastMessage({
            htmlBlocks: [
              ...(useCanvasStore.getState().messages.at(-1)?.htmlBlocks ?? []),
              { slideIndex, html },
            ],
          });
        },
        onDone: () => {
          updateLastMessage({ isStreaming: false });
          setIsStreaming(false);
        },
        onError: (message) => {
          updateLastMessage({
            content: contentRef.current || `Error: ${message}`,
            isStreaming: false,
          });
          setIsStreaming(false);
        },
      },
    );
  }, [
    input,
    isStreaming,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    config,
    conversationId,
    sendMessage,
    onHtmlBlock,
    chatMode,
    attachments,
    activeProvider,
  ]);

  const handleProjectChange = useCallback(
    (projectId: number | null) => {
      setConfig({ projectId });
      setAttachments([]);
      setDesignBankSearch("");
    },
    [setConfig],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      uploadMutation.mutate(file);
      event.target.value = "";
    },
    [uploadMutation],
  );

  const handleUploadFromComputer = useCallback(() => {
    if (config.projectId === null || uploadMutation.isPending) return;
    fileInputRef.current?.click();
  }, [config.projectId, uploadMutation.isPending]);

  const handleDropUpload = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingFile(false);

      if (config.projectId === null || uploadMutation.isPending) return;

      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      uploadMutation.mutate(file);
    },
    [config.projectId, uploadMutation],
  );

  const handleAttachSource = useCallback((source: DesignBankSource) => {
    const attachment = createAttachmentFromSource(source, "design-bank");
    setAttachments((prev) =>
      prev.some((entry) => entry.id === attachment.id)
        ? prev
        : [...prev, attachment],
    );
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((entry) => entry.id !== attachmentId));
  }, []);

  const handleSpeechToText = useCallback(() => {
    setSpeechError(null);
    if (!supportsSpeechRecognition) {
      setSpeechError("Speech to text is not available in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
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

      setInput((prev) => {
        const trimmedPrev = prev.trimEnd();
        return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
      });
    };
    recognition.onerror = (event) => {
      setSpeechError(event.error ?? "Speech to text failed.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [isListening, supportsSpeechRecognition]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && input === "") {
        e.preventDefault();
        setChatMode(chatMode === "plan" ? "build" : "plan");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, input, chatMode, setChatMode],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 pb-2 pt-3">
        <div
          className="inline-flex gap-1 rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-1"
          role="group"
          aria-label="Chat mode"
        >
          <button
            type="button"
            onClick={() => setChatMode("plan")}
            aria-pressed={chatMode === "plan"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              chatMode === "plan"
                ? "bg-zinc-50 text-zinc-900"
                : "bg-transparent text-zinc-400 hover:text-zinc-100",
            )}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setChatMode("build")}
            aria-pressed={chatMode === "build"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              chatMode === "build"
                ? "bg-zinc-50 text-zinc-900"
                : "bg-transparent text-zinc-400 hover:text-zinc-100",
            )}
          >
            Build
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_16px,black_calc(100%-16px),transparent)]">
        {messages.length === 0 && (
          <p className="mt-4 text-center text-xs text-zinc-500">
            {chatMode === "plan"
              ? "Use Plan to explore ideas, copy, and creative direction."
              : "Use Build to generate slides directly in the canvas."}
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-zinc-800/60 px-4 py-4">
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
        />

        <div
          className={cn(
            "rounded-lg border border-zinc-800/70 bg-zinc-950/80 transition-colors",
            isDraggingFile &&
              "border-zinc-600 bg-zinc-900/90 ring-2 ring-white/[0.06]",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            if (config.projectId !== null) setIsDraggingFile(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDragLeave={(event) => {
            if (
              event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              return;
            }
            setIsDraggingFile(false);
          }}
          onDrop={handleDropUpload}
          data-testid="chat-composer"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === "plan"
                ? "Describe your strategy..."
                : "Write a prompt..."
            }
            aria-label="Message for AI assistant"
            disabled={isStreaming}
            rows={2}
            className="min-h-[88px] w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 disabled:opacity-50"
          />

          {attachments.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/70 px-3 py-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex min-w-0 items-start gap-2 rounded-md border border-zinc-800/70 bg-zinc-900/80 px-2.5 py-2 text-xs text-zinc-200"
                >
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800/70 bg-zinc-950/80 text-zinc-500">
                    {attachment.url &&
                    isImageSourceType(attachment.sourceType) ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      attachmentIcon(attachment.sourceType)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {attachment.name}
                      </span>
                      <span className="hidden text-zinc-500 sm:inline">
                        {attachmentOriginLabel(attachment.origin)}
                      </span>
                    </div>
                    <p
                      className="mt-1 line-clamp-2 text-[11px] text-zinc-500"
                      title={attachment.description}
                    >
                      {attachment.description ||
                        `Attached ${attachment.sourceType} reference`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="mt-0.5 text-zinc-500 transition-colors hover:text-zinc-100"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-zinc-800/70 px-3 py-2">
            <div className="flex items-center gap-2">
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
                    onSelect={handleUploadFromComputer}
                    disabled={
                      config.projectId === null || uploadMutation.isPending
                    }
                  >
                    <FileUp size={14} />
                    <span>
                      {uploadMutation.isPending
                        ? "Uploading..."
                        : "Upload from computer"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setIsDesignBankOpen(true)}
                    disabled={config.projectId === null}
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
                      {projectTriggerLabel(projects, config.projectId)}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-64 max-h-72 overflow-y-auto"
                >
                  <DropdownMenuLabel>Select project</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleProjectChange(null)}>
                    <FolderOpen size={14} />
                    <span>No project</span>
                  </DropdownMenuItem>
                  {projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onSelect={() => handleProjectChange(project.id)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: project.color || "#6366f1" }}
                      />
                      <span className="truncate">{project.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <ModelDropdown iconOnly />
              <button
                type="button"
                onClick={handleSpeechToText}
                disabled={!supportsSpeechRecognition && !isListening}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/70 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-600"
                aria-label="Speech to text"
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                onClick={handleSend}
                disabled={
                  (!input.trim() && attachments.length === 0) ||
                  isStreaming ||
                  uploadMutation.isPending
                }
                aria-label="Send message"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-50 text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {(speechError || uploadMutation.isError) && (
          <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {uploadMutation.isError
              ? uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : "Upload failed"
              : speechError}
          </div>
        )}

        <Dialog open={isDesignBankOpen} onOpenChange={setIsDesignBankOpen}>
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
                  {selectedProject
                    ? `Browsing ${selectedProject.name}`
                    : "No project selected"}
                </span>
                <span>{attachments.length} attached</span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  value={designBankSearch}
                  onChange={(event) => setDesignBankSearch(event.target.value)}
                  placeholder="Search assets..."
                  className="border-zinc-800/70 bg-zinc-950/80 pl-9 text-zinc-100"
                />
              </div>

              <div className="max-h-[320px] overflow-y-auto rounded-md border border-zinc-800/70">
                {config.projectId === null && (
                  <div className="px-4 py-6 text-sm text-zinc-500">
                    Select a project first.
                  </div>
                )}

                {config.projectId !== null && isLoadingDesignBank && (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-400">
                    <Loader2 size={14} className="animate-spin" />
                    Loading assets...
                  </div>
                )}

                {config.projectId !== null &&
                  !isLoadingDesignBank &&
                  filteredDesignBankSources.length === 0 && (
                    <div className="px-4 py-6 text-sm text-zinc-500">
                      No assets found for this project.
                    </div>
                  )}

                {filteredDesignBankSources.map((source) => {
                  const alreadyAttached = attachments.some(
                    (entry) => entry.sourceId === source.id,
                  );

                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => handleAttachSource(source)}
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
                      </div>
                      <span className="text-xs text-zinc-500">
                        {alreadyAttached ? "Attached" : "Attach"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
