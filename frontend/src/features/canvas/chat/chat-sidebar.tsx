import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { useCanvasStore } from "../canvas-store";
import {
  FormatDropdown,
  ModelDropdown,
  NetworkDropdown,
} from "../header-dropdowns";
import { cn } from "@/lib/utils";
import type { ChatMessage, ElementReference, SlideData } from "../types";
import { ChatMessageBubble } from "./chat-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchProjectDesignSystemStatus,
  fetchProjectSources,
  syncProjectDesignSystem,
  uploadFile,
} from "../../design-bank/api";
import type {
  DesignBankSource,
  ProjectDesignSystemStatus,
} from "../../design-bank/types";
import { fetchProjects } from "../../projects/api";
import type { Project } from "../../projects/types";
import {
  PromptContextDesignBankDialog,
  PromptContextToolbarLeft,
  attachmentIcon,
  attachmentOriginLabel,
  createPromptContextAttachment,
  filterPromptContextSources,
  isImageSourceType,
  type MutableRef,
  type PromptContextAttachment,
  type SpeechRecognitionLike,
  togglePromptContextSpeechRecognition,
} from "../prompt-context-shared";

type ChatAttachment = PromptContextAttachment;

type ChatMode = "plan" | "build" | "element-edit";

function appendUniqueChatAttachment(
  previous: ChatAttachment[],
  attachment: ChatAttachment,
): ChatAttachment[] {
  return previous.some((entry) => entry.id === attachment.id)
    ? previous
    : [...previous, attachment];
}

function buildPromptWithAttachments(
  input: string,
  attachments: ChatAttachment[],
  elementRef: ElementReference | null,
) {
  const trimmedInput = input.trim();
  const parts: string[] = [trimmedInput];

  if (elementRef) {
    parts.push(
      [
        `\n\n--- ELEMENT TO EDIT ---`,
        `Slide: ${elementRef.slideIndex + 1}`,
        `Element: <${elementRef.tag}> (${elementRef.label})`,
        `CSS path: ${elementRef.cssPath}`,
        `Content: "${elementRef.contentPreview}"`,
        `Current HTML:\n${elementRef.outerHtml}`,
        `---`,
        `IMPORTANT: Apply the requested change ONLY to this specific element. Keep the rest of the slide HTML unchanged.`,
        `Return ONLY a raw JSON object with this exact shape:`,
        `{"type":"element_patch","slideIndex":${elementRef.slideIndex},"cssPath":"${elementRef.cssPath}","updatedOuterHtml":"<full updated outerHTML for the target element>"}`,
        `Do not wrap the JSON in markdown. Do not return the full slide HTML. Do not modify any other element.`,
      ].join("\n"),
    );
  }

  if (attachments.length > 0) {
    const attachmentContext = attachments
      .map((attachment, index) => {
        const attachmentDetails = [
          `${index + 1}. ${attachment.name} [${attachment.sourceType}]`,
        ];
        if (attachment.url) {
          attachmentDetails.push(`URL: ${attachment.url}`);
        }
        if (attachment.description) {
          attachmentDetails.push(`Notes: ${attachment.description}`);
        }
        return attachmentDetails.join(" ");
      })
      .join("\n");
    parts.push(`\n\nReference context from attachments:\n${attachmentContext}`);
  }

  return parts.join("").trim();
}

function getSlideHtmlContext(slideData: SlideData | undefined): string | null {
  if (!slideData) return null;
  const activeVariant = slideData.variants.find(
    (variant) => variant.id === slideData.activeVariantId,
  );
  if (!activeVariant) return null;
  return `<!-- SLIDE ${slideData.slideIndex} -->\n${activeVariant.html}`;
}

function buildCurrentHtmlContext(
  slides: Map<string, SlideData>,
  globalStyles: string,
  elementRef: ElementReference | null,
  selectedSlideIds: string[],
) {
  const currentHtmlPieces: string[] = [];

  if (globalStyles.trim()) {
    currentHtmlPieces.push(
      `<!-- GLOBAL STYLES -->\n<style>\n${globalStyles}\n</style>`,
    );
  }

  if (elementRef) {
    const selectedSlideHtml = getSlideHtmlContext(
      slides.get(elementRef.slideId),
    );
    if (selectedSlideHtml) {
      currentHtmlPieces.push(selectedSlideHtml);
      return currentHtmlPieces.join("\n\n");
    }
  }

  if (selectedSlideIds.length > 0) {
    for (const slideId of selectedSlideIds) {
      const slideHtml = getSlideHtmlContext(slides.get(slideId));
      if (slideHtml) currentHtmlPieces.push(slideHtml);
    }
    return currentHtmlPieces.join("\n\n");
  }

  const orderedSlides = Array.from(slides.values()).sort(
    (a, b) => a.slideIndex - b.slideIndex,
  );

  for (const slideData of orderedSlides) {
    const slideHtml = getSlideHtmlContext(slideData);
    if (slideHtml) currentHtmlPieces.push(slideHtml);
  }

  return currentHtmlPieces.join("\n\n");
}

function buildSelectedSlideBadges(
  slides: Map<string, SlideData>,
  selectedSlideIds: string[],
) {
  return selectedSlideIds
    .map((slideId) => {
      const slide = slides.get(slideId);
      if (!slide) return null;
      return {
        slideId,
        label: `${slide.slideIndex + 1}`,
        title: slide.name
          ? `Slide ${slide.slideIndex + 1}: ${slide.name}`
          : `Slide ${slide.slideIndex + 1}`,
      };
    })
    .filter(
      (slide): slide is { slideId: string; label: string; title: string } =>
        Boolean(slide),
    );
}

function containsHtmlLikeContent(content: string): boolean {
  return /<(html|body|div|section|p|h[1-6]|style|svg|figure)\b/i.test(content);
}

function getDesignSystemDismissKey(projectId: number) {
  return `design-system-nudge:${projectId}`;
}

function readDismissedRevision(projectId: number | null): string | null {
  if (projectId === null || typeof globalThis === "undefined") return null;
  return globalThis.localStorage.getItem(getDesignSystemDismissKey(projectId));
}

function writeDismissedRevision(projectId: number, revision: string) {
  if (typeof globalThis === "undefined") return;
  globalThis.localStorage.setItem(
    getDesignSystemDismissKey(projectId),
    revision,
  );
}

function currentStatusRevision(
  status: ProjectDesignSystemStatus | undefined,
): string {
  if (!status) return "";
  if (status.has_design_system) {
    return (
      status.last_relevant_source_at ??
      status.artifact_revision ??
      "has-artifacts"
    );
  }
  return status.last_relevant_source_at ?? "missing-design-system";
}

function shouldShowDesignSystemPrompt(
  dismissedRevision: string | null,
  status: ProjectDesignSystemStatus | undefined,
) {
  if (!status) return false;
  const activeRevision = currentStatusRevision(status);
  if (dismissedRevision && dismissedRevision === activeRevision) {
    return false;
  }
  return !status.has_design_system || status.is_outdated;
}

import { useChatStream } from "./use-chat-stream";
import { useChatToCanvas } from "../hooks/use-chat-to-canvas";
import { useActiveProvider } from "../use-active-provider";

type SendMessageFn = ReturnType<typeof useChatStream>["sendMessage"];
type ChatToCanvasHandlers = ReturnType<typeof useChatToCanvas>;

function buildChatApiMessages(
  messages: ChatMessage[],
  chatMode: ChatMode,
  promptText: string,
) {
  const apiMessages = messages
    .filter((message) => {
      if (message.role === "user") return true;
      if (message.role !== "assistant" || !message.content) return false;

      if (chatMode === "plan") {
        if (message.htmlBlocks.length > 0) return false;
        if (containsHtmlLikeContent(message.content)) return false;
      }

      return true;
    })
    .map((message) => ({ role: message.role, content: message.content }));

  apiMessages.push({ role: "user", content: promptText });
  return apiMessages;
}

function createStreamingAssistantMessage(
  provider: string,
  modelId: string | null,
): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content: "",
    htmlBlocks: [],
    isStreaming: true,
    createdAt: new Date(),
    provider,
    modelId: modelId ?? undefined,
  };
}

function startChatSidebarStream(params: {
  visibleText: string;
  promptText: string;
  currentElementRef: ElementReference | null;
  provider: string;
  modelId: string | null;
  chatMode: ChatMode;
  config: ReturnType<typeof useCanvasStore.getState>["config"];
  messages: ChatMessage[];
  conversationId: number | null;
  sendMessage: SendMessageFn;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (patch: Partial<ChatMessage>) => void;
  setIsStreaming: (value: boolean) => void;
  onHtmlBlock: ChatToCanvasHandlers["onHtmlBlock"];
  onElementPatch: ChatToCanvasHandlers["onElementPatch"];
  contentRef: MutableRef<string>;
}): void {
  const expectsElementPatch = Boolean(
    params.currentElementRef && params.chatMode !== "plan",
  );
  const requestMode = expectsElementPatch ? "element-edit" : params.chatMode;
  let patchApplied = false;
  let patchHandled = false;
  let rawPatchResponse = "";

  params.addMessage({
    id: `user-${Date.now()}`,
    role: "user",
    content: params.visibleText,
    htmlBlocks: [],
    createdAt: new Date(),
  });
  params.addMessage(
    createStreamingAssistantMessage(params.provider, params.modelId),
  );
  params.setIsStreaming(true);
  params.contentRef.current = "";

  const currentState = useCanvasStore.getState();
  const currentHtml = buildCurrentHtmlContext(
    currentState.slides,
    currentState.globalStyles,
    params.currentElementRef,
    currentState.selectedSlideIds,
  );

  void params.sendMessage(
    {
      conversationId: params.conversationId,
      messages: buildChatApiMessages(
        params.messages,
        params.chatMode,
        params.promptText,
      ),
      provider: params.provider,
      modelId: params.modelId,
      projectId: params.config.projectId,
      formatKey: params.config.formatKey,
      network: params.config.network,
      mode: requestMode,
      currentHtml,
    },
    {
      onToken: (token) => {
        if (expectsElementPatch) {
          rawPatchResponse += token;
          return;
        }
        params.contentRef.current += token;
        params.updateLastMessage({ content: params.contentRef.current });
      },
      onHtmlBlock: (slideIndex, html) => {
        params.onHtmlBlock(slideIndex, html, params.provider);
        params.updateLastMessage({
          htmlBlocks: [
            ...(useCanvasStore.getState().messages.at(-1)?.htmlBlocks ?? []),
            { slideIndex, html },
          ],
        });
      },
      onElementPatch: (_slideIndex, cssPath, updatedOuterHtml) => {
        if (!params.currentElementRef) return;
        const result = params.onElementPatch(
          params.currentElementRef.slideId,
          params.currentElementRef.variantId,
          cssPath,
          updatedOuterHtml,
        );
        patchHandled = true;

        if (result.applied) {
          patchApplied = true;
          params.updateLastMessage({
            content: `Applied the change to the selected ${params.currentElementRef.label.toLowerCase()}.`,
          });
          return;
        }

        params.updateLastMessage({
          content:
            result.error ??
            "Could not apply the change to the selected element.",
        });
      },
      onDone: () => {
        if (
          expectsElementPatch &&
          !patchApplied &&
          !patchHandled &&
          rawPatchResponse.trim()
        ) {
          params.updateLastMessage({ content: rawPatchResponse.trim() });
        }
        params.updateLastMessage({ isStreaming: false });
        params.setIsStreaming(false);
      },
      onError: (error) => {
        params.updateLastMessage({
          content: params.contentRef.current || error.message,
          isStreaming: false,
          error: {
            code: error.code ?? "unknown",
            category: error.category ?? "provider",
            hint: error.hint ?? "",
            retryable: error.retryable ?? false,
          },
        });
        params.setIsStreaming(false);
      },
    },
  );
}

function startChatSidebarSpeechRecognition(params: {
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
  isListening: boolean;
  supportsSpeechRecognition: boolean;
  setSpeechError: (value: string | null) => void;
  setIsListening: (value: boolean) => void;
  setInput: React.Dispatch<React.SetStateAction<string>>;
}): void {
  togglePromptContextSpeechRecognition({
    recognitionRef: params.recognitionRef,
    isListening: params.isListening,
    supportsSpeechRecognition: params.supportsSpeechRecognition,
    setSpeechError: params.setSpeechError,
    setIsListening: params.setIsListening,
    setText: params.setInput,
  });
}

function useChatSidebarLifecycle(params: {
  messages: ChatMessage[];
  bottomRef: MutableRef<HTMLDivElement | null>;
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
  projectId: number | null;
  setDismissedDesignSystemRevision: (value: string | null) => void;
}): void {
  const {
    messages,
    bottomRef,
    recognitionRef,
    projectId,
    setDismissedDesignSystemRevision,
  } = params;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bottomRef]);

  useEffect(() => {
    const currentRecognition = recognitionRef.current;
    return () => {
      currentRecognition?.stop();
    };
  }, [recognitionRef]);

  useEffect(() => {
    setDismissedDesignSystemRevision(readDismissedRevision(projectId));
  }, [projectId, setDismissedDesignSystemRevision]);
}

function useChatSidebarAttachmentHandlers(params: {
  projectId: number | null;
  setConfig: ReturnType<typeof useCanvasStore.getState>["setConfig"];
  setAttachments: React.Dispatch<React.SetStateAction<ChatAttachment[]>>;
  setDesignBankSearch: React.Dispatch<React.SetStateAction<string>>;
  fileInputRef: MutableRef<HTMLInputElement | null>;
  isUploadPending: boolean;
  uploadFile: (file: File) => void;
}) {
  const handleProjectChange = useCallback(
    (projectId: number | null) => {
      params.setConfig({ projectId });
      params.setAttachments([]);
      params.setDesignBankSearch("");
    },
    [params],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      params.uploadFile(file);
      event.target.value = "";
    },
    [params],
  );

  const handleUploadFromComputer = useCallback(() => {
    if (params.projectId === null || params.isUploadPending) return;
    params.fileInputRef.current?.click();
  }, [params]);

  const handleAttachSource = useCallback(
    (source: DesignBankSource) => {
      const attachment = createPromptContextAttachment(source, "design-bank");
      params.setAttachments((prev) =>
        appendUniqueChatAttachment(prev, attachment),
      );
    },
    [params],
  );

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      params.setAttachments((prev) =>
        prev.filter((entry) => entry.id !== attachmentId),
      );
    },
    [params],
  );

  return {
    handleProjectChange,
    handleFileChange,
    handleUploadFromComputer,
    handleAttachSource,
    handleRemoveAttachment,
  };
}

function useChatSidebarSpeechHandler(params: {
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
  isListening: boolean;
  supportsSpeechRecognition: boolean;
  setSpeechError: (value: string | null) => void;
  setIsListening: (value: boolean) => void;
  setInput: React.Dispatch<React.SetStateAction<string>>;
}) {
  return useCallback(() => {
    startChatSidebarSpeechRecognition({
      recognitionRef: params.recognitionRef,
      isListening: params.isListening,
      supportsSpeechRecognition: params.supportsSpeechRecognition,
      setSpeechError: params.setSpeechError,
      setIsListening: params.setIsListening,
      setInput: params.setInput,
    });
  }, [params]);
}

function useChatComposerDragDrop(params: {
  composerRef: React.RefObject<HTMLDivElement | null>;
  projectId: number | null;
  isUploadPending: boolean;
  uploadFile: (file: File) => void;
  setIsDraggingFile: (value: boolean) => void;
}) {
  useEffect(() => {
    const composer = params.composerRef.current;
    if (!composer) {
      return;
    }

    const handleDragEnter = (event: DragEvent) => {
      event.preventDefault();
      if (params.projectId !== null) {
        params.setIsDraggingFile(true);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
      if (composer.contains(event.relatedTarget as Node | null)) {
        return;
      }
      params.setIsDraggingFile(false);
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      params.setIsDraggingFile(false);
      if (params.projectId === null || params.isUploadPending) {
        return;
      }
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        params.uploadFile(file);
      }
    };

    composer.addEventListener("dragenter", handleDragEnter);
    composer.addEventListener("dragover", handleDragOver);
    composer.addEventListener("dragleave", handleDragLeave);
    composer.addEventListener("drop", handleDrop);
    return () => {
      composer.removeEventListener("dragenter", handleDragEnter);
      composer.removeEventListener("dragover", handleDragOver);
      composer.removeEventListener("dragleave", handleDragLeave);
      composer.removeEventListener("drop", handleDrop);
    };
  }, [params]);
}

function getChatSidebarUiState(params: {
  elementReference: ElementReference | null;
  selectedSlideBadges: Array<{ slideId: string; label: string; title: string }>;
  chatMode: ChatMode;
  speechError: string | null;
  uploadError: unknown;
}) {
  let chatInputPlaceholder = "Write a prompt...";
  if (params.elementReference) {
    chatInputPlaceholder = `Describe how to change this ${params.elementReference.label.toLowerCase()}...`;
  } else if (params.selectedSlideBadges.length > 1) {
    chatInputPlaceholder = `Describe changes for ${params.selectedSlideBadges.length} selected slides...`;
  } else if (params.selectedSlideBadges.length === 1) {
    chatInputPlaceholder = `Describe changes for slide ${params.selectedSlideBadges[0].label}...`;
  } else if (params.chatMode === "plan") {
    chatInputPlaceholder = "Describe your strategy...";
  }

  let chatUploadErrorMessage = params.speechError;
  if (params.uploadError instanceof Error) {
    chatUploadErrorMessage = params.uploadError.message;
  }

  return { chatInputPlaceholder, chatUploadErrorMessage };
}

function ChatDesignSystemPromptCard({
  tone,
  onPrimary,
  onDismiss,
}: Readonly<{
  tone: "create" | "refresh";
  onPrimary: () => void;
  onDismiss: () => void;
}>) {
  return (
    <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.06] px-3 py-3 text-sm text-zinc-100">
      <div className="flex items-start gap-3">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-blue-300" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-blue-200">
            {tone === "create"
              ? "No design system yet"
              : "New Design Bank context detected"}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-300">
            {tone === "create"
              ? "You do not have a project design system yet. Create one now so the AI can reuse compact visual rules and a project reference brief instead of rereading the full Design Bank every time."
              : "You added new textual Design Bank content. Refresh the project design system so future generations reuse the updated compacted context automatically."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrimary}
              className="rounded-md bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-white"
            >
              {tone === "create" ? "Yes, let's start" : "Update now"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.04]"
            >
              {tone === "create" ? "Not now" : "Later"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatSidebarHeader({
  chatMode,
  setChatMode,
}: Readonly<{
  chatMode: ChatMode;
  setChatMode: (mode: "plan" | "build") => void;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0 px-4 pb-2 pt-3 border-b border-zinc-800/60 bg-zinc-950/50">
      <fieldset className="inline-flex gap-1 rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-1">
        <legend className="sr-only">Chat mode</legend>
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
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <NetworkDropdown />
        <FormatDropdown />
      </div>
    </div>
  );
}

function ChatSidebarMessageList({
  messages,
  chatMode,
  designSystemPrompt,
  bottomRef,
}: Readonly<{
  messages: ChatMessage[];
  chatMode: ChatMode;
  designSystemPrompt: React.ReactNode;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}>) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_16px,black_calc(100%-16px),transparent)]">
      {messages.length === 0 && designSystemPrompt}
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
  );
}

function ChatSelectedSlidesStrip({
  selectedSlideBadges,
}: Readonly<{
  selectedSlideBadges: Array<{ slideId: string; label: string; title: string }>;
}>) {
  if (selectedSlideBadges.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-zinc-800/70 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
          Working on
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {selectedSlideBadges.slice(0, 5).map((slide) => (
            <span
              key={slide.slideId}
              title={slide.title}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/80 px-1.5 text-[10px] font-medium text-zinc-300"
            >
              {slide.label}
            </span>
          ))}
          {selectedSlideBadges.length > 5 && (
            <span className="inline-flex h-5 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/80 px-1.5 text-[10px] font-medium text-zinc-400">
              +{selectedSlideBadges.length - 5}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatElementReferenceBanner({
  elementReference,
  clearElementReference,
}: Readonly<{
  elementReference: ElementReference | null;
  clearElementReference: () => void;
}>) {
  if (!elementReference) {
    return null;
  }

  return (
    <div className="border-t border-zinc-800/70 px-3 py-2">
      <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/[0.06] px-2.5 py-2 text-xs">
        <Sparkles size={13} className="mt-0.5 flex-shrink-0 text-blue-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-blue-300">
              Editing {elementReference.label}
            </span>
            <span className="text-zinc-500">
              Slide {elementReference.slideIndex + 1}
            </span>
          </div>
          <p
            className="mt-0.5 truncate text-zinc-400"
            title={elementReference.contentPreview}
          >
            &lt;{elementReference.tag}&gt; {elementReference.contentPreview}
          </p>
        </div>
        <button
          type="button"
          onClick={clearElementReference}
          className="mt-0.5 flex-shrink-0 text-zinc-500 transition-colors hover:text-zinc-100"
          aria-label="Remove element reference"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function ChatAttachmentGrid({
  attachments,
  handleRemoveAttachment,
}: Readonly<{
  attachments: ChatAttachment[];
  handleRemoveAttachment: (attachmentId: string) => void;
}>) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/70 px-3 py-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex min-w-0 items-start gap-2 rounded-md border border-zinc-800/70 bg-zinc-900/80 px-2.5 py-2 text-xs text-zinc-200"
        >
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800/70 bg-zinc-950/80 text-zinc-500">
            {attachment.url && isImageSourceType(attachment.sourceType) ? (
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
              <span className="truncate font-medium">{attachment.name}</span>
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
  );
}

function ChatComposerPanel({
  fileInputRef,
  composerRef,
  messages,
  designSystemPrompt,
  isDraggingFile,
  selectedSlideBadges,
  input,
  setInput,
  handleKeyDown,
  chatInputPlaceholder,
  isStreaming,
  elementReference,
  clearElementReference,
  attachments,
  handleRemoveAttachment,
  handleFileChange,
  handleUploadFromComputer,
  openDesignBank,
  uploadPending,
  projectId,
  projects,
  handleProjectChange,
  supportsSpeechRecognition,
  isListening,
  handleSpeechToText,
  handleSend,
}: Readonly<{
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  composerRef: React.RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  designSystemPrompt: React.ReactNode;
  isDraggingFile: boolean;
  selectedSlideBadges: Array<{ slideId: string; label: string; title: string }>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  chatInputPlaceholder: string;
  isStreaming: boolean;
  elementReference: ElementReference | null;
  clearElementReference: () => void;
  attachments: ChatAttachment[];
  handleRemoveAttachment: (attachmentId: string) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleUploadFromComputer: () => void;
  openDesignBank: () => void;
  uploadPending: boolean;
  projectId: number | null;
  projects: Project[];
  handleProjectChange: (projectId: number | null) => void;
  supportsSpeechRecognition: boolean;
  isListening: boolean;
  handleSpeechToText: () => void;
  handleSend: () => void;
}>) {
  return (
    <div className="flex-shrink-0 border-t border-zinc-800/60 px-4 py-4">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div
        ref={composerRef}
        className={cn(
          "rounded-lg border border-zinc-800/70 bg-zinc-950/80 transition-colors",
          isDraggingFile &&
            "border-zinc-600 bg-zinc-900/90 ring-2 ring-white/[0.06]",
        )}
        data-testid="chat-composer"
      >
        {messages.length > 0 && designSystemPrompt && (
          <div className="border-b border-zinc-800/70 px-3 py-3">
            {designSystemPrompt}
          </div>
        )}

        <ChatSelectedSlidesStrip selectedSlideBadges={selectedSlideBadges} />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chatInputPlaceholder}
          aria-label="Message for AI assistant"
          disabled={isStreaming}
          rows={2}
          className="min-h-[88px] w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 disabled:opacity-50"
        />

        <ChatElementReferenceBanner
          elementReference={elementReference}
          clearElementReference={clearElementReference}
        />

        <ChatAttachmentGrid
          attachments={attachments}
          handleRemoveAttachment={handleRemoveAttachment}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 px-3 py-2">
          <PromptContextToolbarLeft
            canOpenAttachmentActions={projectId !== null}
            uploadPending={uploadPending}
            onUploadFromComputer={handleUploadFromComputer}
            onOpenDesignBank={openDesignBank}
            projects={projects}
            projectId={projectId}
            onProjectChange={handleProjectChange}
          />

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
                uploadPending
              }
              aria-label="Send message"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-50 text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatDesignBankDialog({
  open,
  onOpenChange,
  selectedProjectName,
  attachmentsCount,
  designBankSearch,
  setDesignBankSearch,
  projectId,
  isLoading,
  filteredSources,
  attachments,
  handleAttachSource,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProjectName: string | null;
  attachmentsCount: number;
  designBankSearch: string;
  setDesignBankSearch: (value: string) => void;
  projectId: number | null;
  isLoading: boolean;
  filteredSources: DesignBankSource[];
  attachments: ChatAttachment[];
  handleAttachSource: (source: DesignBankSource) => void;
}>) {
  return (
    <PromptContextDesignBankDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedProjectName={selectedProjectName}
      attachmentsCount={attachmentsCount}
      search={designBankSearch}
      setSearch={setDesignBankSearch}
      projectId={projectId}
      isLoading={isLoading}
      filteredSources={filteredSources}
      attachments={attachments}
      onAttachSource={handleAttachSource}
    />
  );
}

function ChatDesignSystemDialogs({
  isDesignSystemRefreshConfirmOpen,
  setIsDesignSystemRefreshConfirmOpen,
  setIsDesignSystemWizardOpen,
  isDesignSystemWizardOpen,
  designSystemMutation,
  designSystemPromptTone,
  designSystemStatus,
  designSystemGuidance,
  setDesignSystemGuidance,
}: Readonly<{
  isDesignSystemRefreshConfirmOpen: boolean;
  setIsDesignSystemRefreshConfirmOpen: (open: boolean) => void;
  setIsDesignSystemWizardOpen: (open: boolean) => void;
  isDesignSystemWizardOpen: boolean;
  designSystemMutation: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    mutate: () => void;
  };
  designSystemPromptTone: "create" | "refresh";
  designSystemStatus: ProjectDesignSystemStatus | undefined;
  designSystemGuidance: string;
  setDesignSystemGuidance: (value: string) => void;
}>) {
  return (
    <>
      <Dialog
        open={isDesignSystemRefreshConfirmOpen}
        onOpenChange={setIsDesignSystemRefreshConfirmOpen}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace manual edits?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              You manually edited the project design system or reference brief.
              Refreshing now may replace those edits with a newly synthesized
              version based on the latest Design Bank content.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDesignSystemRefreshConfirmOpen(false)}
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDesignSystemRefreshConfirmOpen(false);
                setIsDesignSystemWizardOpen(true);
              }}
              className="rounded-md bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-white"
            >
              Yes, update
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDesignSystemWizardOpen}
        onOpenChange={(open) => {
          if (!designSystemMutation.isPending) {
            setIsDesignSystemWizardOpen(open);
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {designSystemPromptTone === "create"
                ? "Create project design system"
                : "Refresh project design system"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              The AI will compress the textual Design Bank inputs into a
              reusable design system and a reference brief, then use those
              artifacts as the default project context for future slide
              generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
              Relevant textual sources detected:{" "}
              {designSystemStatus?.relevant_source_count ?? 0}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="design-system-guidance"
                className="text-xs font-medium text-zinc-300"
              >
                Optional guidance
              </label>
              <textarea
                id="design-system-guidance"
                value={designSystemGuidance}
                onChange={(event) =>
                  setDesignSystemGuidance(event.target.value)
                }
                placeholder="Example: prioritize a bold editorial system, structured hierarchy, and premium product storytelling."
                className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-700"
              />
            </div>

            {designSystemMutation.isError && (
              <p className="text-xs text-red-400">
                {designSystemMutation.error instanceof Error
                  ? designSystemMutation.error.message
                  : "Could not build the project design system."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDesignSystemWizardOpen(false)}
                disabled={designSystemMutation.isPending}
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => designSystemMutation.mutate()}
                disabled={designSystemMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
              >
                {designSystemMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                {designSystemPromptTone === "create"
                  ? "Create design system"
                  : "Refresh design system"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ChatSidebar() {
  const queryClient = useQueryClient();
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
  const elementReference = useCanvasStore((s) => s.elementReference);
  const clearElementReference = useCanvasStore((s) => s.clearElementReference);
  const selectedSlideIds = useCanvasStore((s) => s.selectedSlideIds);
  const slides = useCanvasStore((s) => s.slides);

  const { activeProvider } = useActiveProvider();

  const { sendMessage } = useChatStream();
  const { onHtmlBlock, onElementPatch } = useChatToCanvas();

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDesignBankOpen, setIsDesignBankOpen] = useState(false);
  const [designBankSearch, setDesignBankSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isDesignSystemWizardOpen, setIsDesignSystemWizardOpen] =
    useState(false);
  const [
    isDesignSystemRefreshConfirmOpen,
    setIsDesignSystemRefreshConfirmOpen,
  ] = useState(false);
  const [designSystemGuidance, setDesignSystemGuidance] = useState("");
  const [dismissedDesignSystemRevision, setDismissedDesignSystemRevision] =
    useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
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

  const { data: designSystemStatus } = useQuery({
    queryKey: ["project-design-system-status", config.projectId],
    queryFn: () => fetchProjectDesignSystemStatus(config.projectId as number),
    enabled: config.projectId !== null,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, config.projectId ?? undefined),
    onSuccess: (source) => {
      const attachment = createPromptContextAttachment(source, "upload");
      setAttachments((prev) =>
        prev.some((entry) => entry.id === attachment.id)
          ? prev
          : [...prev, attachment],
      );
      if (config.projectId !== null) {
        void queryClient.invalidateQueries({
          queryKey: ["project-design-system-status", config.projectId],
        });
      }
    },
  });

  const designSystemMutation = useMutation({
    mutationFn: () => {
      if (config.projectId === null) {
        throw new Error("Project required");
      }
      const provider = activeProvider ?? "openai";
      const modelId = config.selectedModels?.[provider] ?? null;
      return syncProjectDesignSystem(config.projectId, {
        provider,
        model_id: modelId,
        guidance: designSystemGuidance.trim(),
      });
    },
    onSuccess: async (result) => {
      if (config.projectId !== null) {
        await queryClient.invalidateQueries({
          queryKey: ["project-design-system-status", config.projectId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["project-sources", config.projectId],
        });
        writeDismissedRevision(
          config.projectId,
          currentStatusRevision(result.status),
        );
        setDismissedDesignSystemRevision(currentStatusRevision(result.status));
      }
      addMessage({
        id: `assistant-design-system-${Date.now()}`,
        role: "assistant",
        content: designSystemStatus?.has_design_system
          ? "Updated the project design system and reference brief so future generations can reuse the latest design-bank context."
          : "Created a project design system and reference brief. Future slide generations will reuse this compacted context automatically.",
        htmlBlocks: [],
        createdAt: new Date(),
      });
      setDesignSystemGuidance("");
      setIsDesignSystemWizardOpen(false);
    },
  });

  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === config.projectId) ?? null,
    [projects, config.projectId],
  );

  const filteredDesignBankSources = useMemo(
    () => filterPromptContextSources(designBankSources, designBankSearch),
    [designBankSearch, designBankSources],
  );

  const supportsSpeechRecognition =
    typeof globalThis !== "undefined" &&
    Boolean(
      "SpeechRecognition" in globalThis ||
      "webkitSpeechRecognition" in globalThis,
    );

  const selectedSlideBadges = useMemo(
    () => buildSelectedSlideBadges(slides, selectedSlideIds),
    [slides, selectedSlideIds],
  );

  const showDesignSystemPrompt = useMemo(
    () =>
      shouldShowDesignSystemPrompt(
        dismissedDesignSystemRevision,
        designSystemStatus,
      ),
    [dismissedDesignSystemRevision, designSystemStatus],
  );

  const designSystemPromptTone = designSystemStatus?.has_design_system
    ? "refresh"
    : "create";

  useChatSidebarLifecycle({
    messages,
    bottomRef,
    recognitionRef,
    projectId: config.projectId,
    setDismissedDesignSystemRevision,
  });

  const handleSend = useCallback(() => {
    const currentElementRef = useCanvasStore.getState().elementReference;
    const visibleText = input.trim();
    const promptText = buildPromptWithAttachments(
      visibleText,
      attachments,
      currentElementRef,
    );
    if (!promptText || isStreaming) return;
    setInput("");
    setAttachments([]);
    clearElementReference();
    setSpeechError(null);

    const provider = activeProvider ?? "openai";
    const modelId = config.selectedModels?.[provider] ?? null;

    startChatSidebarStream({
      visibleText,
      promptText,
      currentElementRef,
      provider,
      modelId,
      chatMode,
      config,
      messages,
      conversationId,
      sendMessage,
      addMessage,
      updateLastMessage,
      setIsStreaming,
      onHtmlBlock,
      onElementPatch,
      contentRef,
    });
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
    onElementPatch,
    chatMode,
    attachments,
    activeProvider,
    clearElementReference,
    messages,
  ]);

  const {
    handleProjectChange,
    handleFileChange,
    handleUploadFromComputer,
    handleAttachSource,
    handleRemoveAttachment,
  } = useChatSidebarAttachmentHandlers({
    projectId: config.projectId,
    setConfig,
    setAttachments,
    setDesignBankSearch,
    fileInputRef,
    isUploadPending: uploadMutation.isPending,
    uploadFile: (file) => uploadMutation.mutate(file),
  });

  useChatComposerDragDrop({
    composerRef,
    projectId: config.projectId,
    isUploadPending: uploadMutation.isPending,
    uploadFile: (file) => uploadMutation.mutate(file),
    setIsDraggingFile,
  });

  const handleSpeechToText = useChatSidebarSpeechHandler({
    recognitionRef,
    isListening,
    supportsSpeechRecognition,
    setSpeechError,
    setIsListening,
    setInput,
  });

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

  const handleDismissDesignSystemPrompt = useCallback(() => {
    if (config.projectId === null || !designSystemStatus) return;
    writeDismissedRevision(
      config.projectId,
      currentStatusRevision(designSystemStatus),
    );
    setDismissedDesignSystemRevision(currentStatusRevision(designSystemStatus));
  }, [config.projectId, designSystemStatus]);

  const handleOpenDesignSystemWizard = useCallback(() => {
    if (
      designSystemStatus?.has_design_system &&
      designSystemStatus.has_manual_edits
    ) {
      setIsDesignSystemRefreshConfirmOpen(true);
      return;
    }
    setIsDesignSystemWizardOpen(true);
  }, [designSystemStatus]);

  const designSystemPrompt = showDesignSystemPrompt ? (
    <ChatDesignSystemPromptCard
      tone={designSystemPromptTone}
      onPrimary={handleOpenDesignSystemWizard}
      onDismiss={handleDismissDesignSystemPrompt}
    />
  ) : null;

  const { chatInputPlaceholder, chatUploadErrorMessage } =
    getChatSidebarUiState({
      elementReference,
      selectedSlideBadges,
      chatMode,
      speechError,
      uploadError: uploadMutation.isError ? uploadMutation.error : null,
    });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatSidebarHeader chatMode={chatMode} setChatMode={setChatMode} />

      <ChatSidebarMessageList
        messages={messages}
        chatMode={chatMode}
        designSystemPrompt={designSystemPrompt}
        bottomRef={bottomRef}
      />

      <div className="flex-shrink-0">
        <ChatComposerPanel
          fileInputRef={fileInputRef}
          composerRef={composerRef}
          messages={messages}
          designSystemPrompt={designSystemPrompt}
          isDraggingFile={isDraggingFile}
          selectedSlideBadges={selectedSlideBadges}
          input={input}
          setInput={setInput}
          handleKeyDown={handleKeyDown}
          chatInputPlaceholder={chatInputPlaceholder}
          isStreaming={isStreaming}
          elementReference={elementReference}
          clearElementReference={clearElementReference}
          attachments={attachments}
          handleRemoveAttachment={handleRemoveAttachment}
          handleFileChange={handleFileChange}
          handleUploadFromComputer={handleUploadFromComputer}
          openDesignBank={() => setIsDesignBankOpen(true)}
          uploadPending={uploadMutation.isPending}
          projectId={config.projectId}
          projects={projects}
          handleProjectChange={handleProjectChange}
          supportsSpeechRecognition={supportsSpeechRecognition}
          isListening={isListening}
          handleSpeechToText={handleSpeechToText}
          handleSend={handleSend}
        />

        {(speechError || uploadMutation.isError) && (
          <div className="px-4 pb-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              {chatUploadErrorMessage}
            </div>
          </div>
        )}

        <ChatDesignBankDialog
          open={isDesignBankOpen}
          onOpenChange={setIsDesignBankOpen}
          selectedProjectName={selectedProject?.name ?? null}
          attachmentsCount={attachments.length}
          designBankSearch={designBankSearch}
          setDesignBankSearch={setDesignBankSearch}
          projectId={config.projectId}
          isLoading={isLoadingDesignBank}
          filteredSources={filteredDesignBankSources}
          attachments={attachments}
          handleAttachSource={handleAttachSource}
        />
      </div>

      <ChatDesignSystemDialogs
        isDesignSystemRefreshConfirmOpen={isDesignSystemRefreshConfirmOpen}
        setIsDesignSystemRefreshConfirmOpen={
          setIsDesignSystemRefreshConfirmOpen
        }
        setIsDesignSystemWizardOpen={setIsDesignSystemWizardOpen}
        isDesignSystemWizardOpen={isDesignSystemWizardOpen}
        designSystemMutation={designSystemMutation}
        designSystemPromptTone={designSystemPromptTone}
        designSystemStatus={designSystemStatus}
        designSystemGuidance={designSystemGuidance}
        setDesignSystemGuidance={setDesignSystemGuidance}
      />
    </div>
  );
}
