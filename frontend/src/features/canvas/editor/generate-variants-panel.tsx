import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  FolderOpen,
  Layers,
  Loader2,
  Mic,
  MicOff,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { useCanvasStore } from "../canvas-store";
import { streamChatMessage } from "../chat/use-chat-stream";
import { Button } from "@/components/ui/button";
import { fetchProjectSources, uploadFile } from "../../design-bank/api";
import type { DesignBankSource } from "../../design-bank/types";
import { fetchProjects } from "../../projects/api";
import type { Project } from "../../projects/types";
import type {
  CreativeRange,
  VariantAspect,
  VariantGenerationMeta,
} from "../types";
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

interface ProviderStatus {
  provider: string;
  modelId: string;
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
  errorCode?: string;
  errorHint?: string;
  errorRetryable?: boolean;
}

type PromptAttachment = PromptContextAttachment;

interface GenerateVariantsDraft {
  instruction: string;
  creativeRange: CreativeRange;
  selectedAspects: VariantAspect[];
  attachments: PromptAttachment[];
  updatedAt: number;
}

type AddGeneratedVariantToSlide = (
  slideId: string,
  html: string,
  provider: string,
  modelId: string,
  metadata: VariantGenerationMeta,
) => void;

const GENERATE_VARIANTS_DRAFTS_KEY = "plurist:generate-variants-drafts";
const GENERATE_VARIANTS_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const CREATIVE_RANGE_LABELS: Record<CreativeRange, string> = {
  refine: "Refine",
  explore: "Explore",
  reimagine: "Reimagine",
};

const CREATIVE_RANGE_PROMPTS: Record<CreativeRange, string> = {
  refine:
    "Make subtle refinements to improve polish and visual quality. Keep the same structure, colors, and layout. Focus on spacing, alignment, and micro-details.",
  explore:
    "Explore a different creative direction. You may change colors, layout emphasis, and visual hierarchy while keeping the same content and overall purpose.",
  reimagine:
    "Completely reimagine this design from scratch. Same content and purpose, but feel free to use a radically different layout, color palette, typography, and visual approach.",
};

const ASPECT_OPTIONS: { key: VariantAspect; label: string }[] = [
  { key: "layout", label: "Layout" },
  { key: "color", label: "Color scheme" },
  { key: "typography", label: "Typography" },
  { key: "content", label: "Content" },
];

const ASPECT_PROMPTS: Record<VariantAspect, string> = {
  layout: "Focus changes on the layout and spatial arrangement.",
  color: "Focus changes on the color palette and color usage.",
  typography: "Focus changes on font choices, sizes, and text hierarchy.",
  content: "Rewrite the text content while keeping the same meaning.",
};

function buildVariantsPrompt(
  html: string,
  instruction: string,
  creativeRange: CreativeRange,
  aspects: VariantAspect[],
  attachments: PromptAttachment[],
) {
  const rangeDirective = CREATIVE_RANGE_PROMPTS[creativeRange];
  const aspectDirectives = aspects
    .map((a) => ASPECT_PROMPTS[a])
    .filter(Boolean)
    .join(" ");
  const attachmentsContext = attachments
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

  const userInstruction = instruction.trim()
    ? `\nAdditional instruction: ${instruction.trim()}`
    : "";
  const promptAttachments = attachmentsContext
    ? `\nReference context from attachments:\n${attachmentsContext}`
    : "";

  return `Generate a new variation of this single social post HTML. Return ONLY one HTML result wrapped with <!-- SLIDE_START 0 --> and <!-- SLIDE_END -->. Do not add explanations outside the HTML block. Preserve editability and visual polish.

Creative direction: ${rangeDirective}
${aspectDirectives ? `Aspect focus: ${aspectDirectives}` : ""}${userInstruction}${promptAttachments}

Current HTML:
${html}`;
}

function createAttachmentFromSource(
  source: DesignBankSource,
  origin: PromptAttachment["origin"],
): PromptAttachment {
  return createPromptContextAttachment(source, origin);
}

function readStoredDrafts(): Record<string, GenerateVariantsDraft> {
  if (typeof globalThis === "undefined") return {};

  try {
    const raw = globalThis.sessionStorage.getItem(GENERATE_VARIANTS_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<
      string,
      Partial<GenerateVariantsDraft>
    >;
    const now = Date.now();

    return Object.fromEntries(
      Object.entries(parsed).filter(([, draft]) => {
        if (typeof draft?.updatedAt !== "number") return true;
        return now - draft.updatedAt < GENERATE_VARIANTS_DRAFT_TTL_MS;
      }),
    ) as Record<string, GenerateVariantsDraft>;
  } catch {
    return {};
  }
}

function writeStoredDrafts(drafts: Record<string, GenerateVariantsDraft>) {
  if (typeof globalThis === "undefined") return;

  try {
    const now = Date.now();
    const prunedDrafts = Object.fromEntries(
      Object.entries(drafts).filter(([, draft]) => {
        if (typeof draft.updatedAt !== "number") return true;
        return now - draft.updatedAt < GENERATE_VARIANTS_DRAFT_TTL_MS;
      }),
    );
    globalThis.sessionStorage.setItem(
      GENERATE_VARIANTS_DRAFTS_KEY,
      JSON.stringify(prunedDrafts),
    );
  } catch {
    // Ignore session storage write failures.
  }
}

function appendUniqueAttachment(
  previous: PromptAttachment[],
  attachment: PromptAttachment,
): PromptAttachment[] {
  return previous.some((entry) => entry.id === attachment.id)
    ? previous
    : [...previous, attachment];
}

function filterDesignBankSources(
  sources: DesignBankSource[],
  search: string,
): DesignBankSource[] {
  return filterPromptContextSources(sources, search);
}

function hydrateGenerateVariantsDraft(
  draft: GenerateVariantsDraft | undefined,
  setInstruction: (value: string) => void,
  setCreativeRange: (value: CreativeRange) => void,
  setSelectedAspects: (value: VariantAspect[]) => void,
  setAttachments: (value: PromptAttachment[]) => void,
  setSpeechError: (value: string | null) => void,
): void {
  setInstruction(draft?.instruction ?? "");
  setCreativeRange(draft?.creativeRange ?? "explore");
  setSelectedAspects(draft?.selectedAspects ?? []);
  setAttachments(draft?.attachments ?? []);
  setSpeechError(null);
}

function persistGenerateVariantsDraft(
  draftsRef: MutableRef<Record<string, GenerateVariantsDraft>>,
  slideId: string,
  draft: GenerateVariantsDraft,
): void {
  draftsRef.current = {
    ...draftsRef.current,
    [slideId]: draft,
  };
  writeStoredDrafts(draftsRef.current);
}

function startGenerateVariantsSpeechRecognition(params: {
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
  isListening: boolean;
  supportsSpeechRecognition: boolean;
  setSpeechError: (value: string | null) => void;
  setIsListening: (value: boolean) => void;
  setInstruction: React.Dispatch<React.SetStateAction<string>>;
}): void {
  togglePromptContextSpeechRecognition({
    recognitionRef: params.recognitionRef,
    isListening: params.isListening,
    supportsSpeechRecognition: params.supportsSpeechRecognition,
    setSpeechError: params.setSpeechError,
    setIsListening: params.setIsListening,
    setText: params.setInstruction,
  });
}

function buildInitialProviderStatuses(
  providers: string[],
  selectedModels: Record<string, string> | undefined,
): ProviderStatus[] {
  return providers.map((provider) => ({
    provider,
    modelId: selectedModels?.[provider] ?? "",
    status: "streaming",
  }));
}

function buildVariantMetadata(params: {
  instruction: string;
  sourceVariantId: number;
  provider: string;
  modelId: string;
  creativeRange: CreativeRange;
  selectedAspects: VariantAspect[];
}): VariantGenerationMeta {
  return {
    sourcePrompt: params.instruction.trim(),
    sourceVariantId: params.sourceVariantId,
    mode: "generate-variants",
    provider: params.provider,
    modelId: params.modelId,
    variantType: "default",
    derivedFromVariantId: params.sourceVariantId,
    variantName: `${params.provider} variant`,
    creativeRange: params.creativeRange,
    aspects: params.selectedAspects,
  };
}

async function runVariantGenerationStreams(params: {
  slideId: string;
  providers: string[];
  selectedModels: Record<string, string> | undefined;
  projectId: number | null;
  formatKey: string;
  network: string | null;
  prompt: string;
  instruction: string;
  creativeRange: CreativeRange;
  selectedAspects: VariantAspect[];
  sourceVariantId: number;
  updateProviderStatus: (
    provider: string,
    patch: Partial<ProviderStatus>,
  ) => void;
  addGeneratedVariantToSlide: AddGeneratedVariantToSlide;
}): Promise<void> {
  const streamPromises = params.providers.map(async (provider) => {
    const modelId = params.selectedModels?.[provider] ?? "";
    let inserted = false;

    try {
      await streamChatMessage(
        {
          conversationId: useCanvasStore.getState().conversationId,
          messages: [{ role: "user", content: params.prompt }],
          provider,
          modelId,
          projectId: params.projectId,
          formatKey: params.formatKey,
          network: params.network,
          mode: "build",
        },
        {
          onToken: () => {},
          onHtmlBlock: (_slideIndex, html) => {
            if (inserted) return;
            inserted = true;
            params.addGeneratedVariantToSlide(
              params.slideId,
              html,
              provider,
              modelId,
              buildVariantMetadata({
                instruction: params.instruction,
                sourceVariantId: params.sourceVariantId,
                provider,
                modelId,
                creativeRange: params.creativeRange,
                selectedAspects: params.selectedAspects,
              }),
            );
          },
          onElementPatch: () => {},
          onDone: () => {
            params.updateProviderStatus(provider, {
              status: inserted ? "done" : "error",
              error: inserted ? undefined : "No usable HTML returned",
            });
          },
          onError: (error) => {
            params.updateProviderStatus(provider, {
              status: "error",
              error: error.message,
              errorCode: error.code,
              errorHint: error.hint,
              errorRetryable: error.retryable,
            });
          },
        },
      );
    } catch (err) {
      params.updateProviderStatus(provider, {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        errorCode: "unknown",
      });
    }
  });

  await Promise.allSettled(streamPromises);
}

function useGenerateVariantsDraftLifecycle(params: {
  target: ReturnType<typeof useCanvasStore.getState>["contextualAiTarget"];
  editor: ReturnType<typeof useCanvasStore.getState>["editor"];
  draftsRef: MutableRef<Record<string, GenerateVariantsDraft>>;
  hydratedSlideIdRef: MutableRef<string | null>;
  instruction: string;
  creativeRange: CreativeRange;
  selectedAspects: VariantAspect[];
  attachments: PromptAttachment[];
  setInstruction: (value: string) => void;
  setCreativeRange: (value: CreativeRange) => void;
  setSelectedAspects: (value: VariantAspect[]) => void;
  setAttachments: (value: PromptAttachment[]) => void;
  setSpeechError: (value: string | null) => void;
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
}): void {
  useEffect(() => {
    if (!params.editor || params.target?.mode !== "generate-variants") return;
    params.editor.select();
  }, [params.editor, params.target]);

  useEffect(() => {
    if (params.target?.mode !== "generate-variants") return;

    const draft = params.draftsRef.current[params.target.slideId];
    params.hydratedSlideIdRef.current = params.target.slideId;
    hydrateGenerateVariantsDraft(
      draft,
      params.setInstruction,
      params.setCreativeRange,
      params.setSelectedAspects,
      params.setAttachments,
      params.setSpeechError,
    );
  }, [
    params.target,
    params.draftsRef,
    params.hydratedSlideIdRef,
    params.setInstruction,
    params.setCreativeRange,
    params.setSelectedAspects,
    params.setAttachments,
    params.setSpeechError,
  ]);

  useEffect(() => {
    if (params.target?.mode !== "generate-variants") return;
    if (params.hydratedSlideIdRef.current !== params.target.slideId) return;

    persistGenerateVariantsDraft(params.draftsRef, params.target.slideId, {
      instruction: params.instruction,
      creativeRange: params.creativeRange,
      selectedAspects: params.selectedAspects,
      attachments: params.attachments,
      updatedAt: Date.now(),
    });
  }, [
    params.attachments,
    params.creativeRange,
    params.instruction,
    params.selectedAspects,
    params.target,
    params.draftsRef,
    params.hydratedSlideIdRef,
  ]);

  useEffect(() => {
    const currentRecognition = params.recognitionRef.current;
    return () => {
      currentRecognition?.stop();
    };
  }, [params.recognitionRef]);
}

function useGenerateVariantsAttachmentHandlers(params: {
  setConfig: ReturnType<typeof useCanvasStore.getState>["setConfig"];
  projectId: number | null;
  fileInputRef: MutableRef<HTMLInputElement | null>;
  uploadMutation: ReturnType<typeof useMutation<DesignBankSource, Error, File>>;
  setAttachments: React.Dispatch<React.SetStateAction<PromptAttachment[]>>;
  setDesignBankSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      params.setAttachments((prev) =>
        prev.filter((entry) => entry.id !== attachmentId),
      );
    },
    [params],
  );

  const handleAttachSource = useCallback(
    (source: DesignBankSource) => {
      const attachment = createAttachmentFromSource(source, "design-bank");
      params.setAttachments((prev) => appendUniqueAttachment(prev, attachment));
    },
    [params],
  );

  const handleProjectChange = useCallback(
    (projectId: number | null) => {
      params.setConfig({ projectId });
      params.setAttachments([]);
      params.setDesignBankSearch("");
    },
    [params],
  );

  const handleUploadFromComputer = useCallback(() => {
    if (params.projectId === null || params.uploadMutation.isPending) return;
    params.fileInputRef.current?.click();
  }, [params]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      params.uploadMutation.mutate(file);
      event.target.value = "";
    },
    [params],
  );

  return {
    handleRemoveAttachment,
    handleAttachSource,
    handleProjectChange,
    handleUploadFromComputer,
    handleFileChange,
  };
}

function useGenerateVariantsSpeechHandler(params: {
  recognitionRef: MutableRef<SpeechRecognitionLike | null>;
  isListening: boolean;
  supportsSpeechRecognition: boolean;
  setSpeechError: (value: string | null) => void;
  setIsListening: (value: boolean) => void;
  setInstruction: React.Dispatch<React.SetStateAction<string>>;
}) {
  return useCallback(() => {
    startGenerateVariantsSpeechRecognition({
      recognitionRef: params.recognitionRef,
      isListening: params.isListening,
      supportsSpeechRecognition: params.supportsSpeechRecognition,
      setSpeechError: params.setSpeechError,
      setIsListening: params.setIsListening,
      setInstruction: params.setInstruction,
    });
  }, [params]);
}

function GenerateVariantsHeader({
  providersCount,
  onClose,
}: Readonly<{
  providersCount: number;
  onClose: () => void;
}>) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-zinc-300" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-50">
            Generate Variants
          </h3>
          <p className="text-xs text-zinc-400">
            Create {providersCount} variations using all selected providers
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close generate variants"
        className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100"
      >
        <X size={16} />
      </Button>
    </div>
  );
}

function GenerateVariantsOptions({
  creativeRange,
  setCreativeRange,
  selectedAspects,
  toggleAspect,
  providers,
  providerStatuses,
}: Readonly<{
  creativeRange: CreativeRange;
  setCreativeRange: (value: CreativeRange) => void;
  selectedAspects: VariantAspect[];
  toggleAspect: (aspect: VariantAspect) => void;
  providers: string[];
  providerStatuses: ProviderStatus[];
}>) {
  return (
    <>
      <div>
        <p className="mb-2 block text-xs font-medium text-zinc-400">
          Creative Range
        </p>
        <div className="flex gap-2">
          {(["refine", "explore", "reimagine"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setCreativeRange(range)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                creativeRange === range
                  ? "border-zinc-50 bg-zinc-50 text-zinc-900"
                  : "border-zinc-800/70 bg-zinc-900/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {CREATIVE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 block text-xs font-medium text-zinc-400">
          Aspects to vary <span className="text-zinc-600">(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ASPECT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleAspect(key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedAspects.includes(key)
                  ? "border-zinc-50 bg-zinc-50 text-zinc-900"
                  : "border-zinc-800/70 bg-zinc-900/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">
          Providers ({providers.length})
        </label>
        <div className="space-y-2">
          {providers.map((provider) => {
            const providerStatus = providerStatuses.find(
              (status) => status.provider === provider,
            );
            return (
              <div
                key={provider}
                className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/70 px-3 py-2"
              >
                <span className="text-xs font-medium capitalize text-zinc-200">
                  {provider}
                </span>
                {providerStatus?.status === "streaming" && (
                  <Loader2 size={14} className="animate-spin text-zinc-400" />
                )}
                {providerStatus?.status === "done" && (
                  <Check size={14} className="text-emerald-400" />
                )}
                {providerStatus?.status === "error" && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-red-400"
                    title={providerStatus.errorHint || providerStatus.error}
                  >
                    <AlertCircle size={12} />
                    {providerStatus.errorCode &&
                    providerStatus.errorCode !== "unknown"
                      ? providerStatus.errorCode.split("_").join(" ")
                      : "Failed"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function useStopKeyboardPropagation(
  panelRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const stopKeyPropagation = (event: KeyboardEvent) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    panel.addEventListener("keydown", stopKeyPropagation);
    panel.addEventListener("keyup", stopKeyPropagation);
    return () => {
      panel.removeEventListener("keydown", stopKeyPropagation);
      panel.removeEventListener("keyup", stopKeyPropagation);
    };
  }, [panelRef]);
}

function getGenerateVariantsUiState(params: {
  providerStatuses: ProviderStatus[];
  providersCount: number;
  attachmentsCount: number;
  supportsSpeechRecognition: boolean;
  isListening: boolean;
  speechError: string | null;
  uploadError: unknown;
  isGenerating: boolean;
  isUploadPending: boolean;
}) {
  const doneCount = params.providerStatuses.filter(
    (status) => status.status === "done",
  ).length;
  const errorCount = params.providerStatuses.filter(
    (status) => status.status === "error",
  ).length;

  let attachmentSummary = "No prompt attachments";
  if (params.attachmentsCount > 0) {
    const attachmentLabel =
      params.attachmentsCount === 1 ? "attachment" : "attachments";
    attachmentSummary = `${params.attachmentsCount} ${attachmentLabel} ready`;
  }

  let speechButtonTitle = "Speech to text is not available";
  if (params.supportsSpeechRecognition) {
    speechButtonTitle = params.isListening
      ? "Stop listening"
      : "Start speech to text";
  }

  const listeningHint = params.isListening
    ? "Listening... speak naturally and we will append the transcript."
    : "Attachments are added as prompt context only.";

  let uploadErrorMessage = params.speechError;
  if (params.uploadError instanceof Error) {
    uploadErrorMessage = params.uploadError.message;
  }

  let generateButtonLabel = `Generate ${params.providersCount} variants`;
  if (params.isGenerating) {
    generateButtonLabel = `Generating ${params.providersCount} variants...`;
  } else if (params.isUploadPending) {
    generateButtonLabel = "Waiting for upload...";
  }

  return {
    doneCount,
    errorCount,
    attachmentSummary,
    speechButtonTitle,
    listeningHint,
    uploadErrorMessage,
    generateButtonLabel,
  };
}

function GenerateVariantsAttachmentList({
  attachments,
  onRemoveAttachment,
}: Readonly<{
  attachments: PromptAttachment[];
  onRemoveAttachment: (attachmentId: string) => void;
}>) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 border-t border-zinc-800/70 px-3 py-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-start gap-3 rounded-md border border-zinc-800/70 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200"
        >
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800/70 bg-zinc-950/80 text-zinc-500">
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
              <span className="text-zinc-500">
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
            onClick={() => onRemoveAttachment(attachment.id)}
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

function GenerateVariantsPromptCard({
  selectedProjectName,
  attachmentSummary,
  instruction,
  setInstruction,
  attachments,
  handleRemoveAttachment,
  canOpenAttachmentActions,
  uploadPending,
  handleUploadFromComputer,
  openDesignBank,
  projects,
  projectId,
  handleProjectChange,
  handleSpeechToText,
  supportsSpeechRecognition,
  isListening,
  speechButtonTitle,
  listeningHint,
}: Readonly<{
  selectedProjectName: string | null;
  attachmentSummary: string;
  instruction: string;
  setInstruction: (value: string) => void;
  attachments: PromptAttachment[];
  handleRemoveAttachment: (attachmentId: string) => void;
  canOpenAttachmentActions: boolean;
  uploadPending: boolean;
  handleUploadFromComputer: () => void;
  openDesignBank: () => void;
  projects: Project[];
  projectId: number | null;
  handleProjectChange: (projectId: number | null) => void;
  handleSpeechToText: () => void;
  supportsSpeechRecognition: boolean;
  isListening: boolean;
  speechButtonTitle: string;
  listeningHint: string;
}>) {
  return (
    <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/80">
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-3 py-2 text-[11px] text-zinc-500">
        <div className="flex min-w-0 items-center gap-2">
          <FolderOpen size={12} />
          <span className="truncate">
            {selectedProjectName
              ? `Project: ${selectedProjectName}`
              : "Project required for uploads and Design Bank"}
          </span>
        </div>
        <span>{attachmentSummary}</span>
      </div>

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="Optional: extra instructions (e.g. 'make it more premium', 'use dark theme'...)"
        className="min-h-[100px] w-full resize-y border-0 bg-transparent p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
      />

      <GenerateVariantsAttachmentList
        attachments={attachments}
        onRemoveAttachment={handleRemoveAttachment}
      />

      <div className="flex items-center justify-between gap-2 border-t border-zinc-800/70 px-3 py-2">
        <PromptContextToolbarLeft
          canOpenAttachmentActions={canOpenAttachmentActions}
          uploadPending={uploadPending}
          onUploadFromComputer={handleUploadFromComputer}
          onOpenDesignBank={openDesignBank}
          projects={projects}
          projectId={projectId}
          onProjectChange={handleProjectChange}
        />

        <button
          type="button"
          onClick={handleSpeechToText}
          disabled={!supportsSpeechRecognition && !isListening}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/70 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-600"
          aria-label="Speech to text"
          title={speechButtonTitle}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800/70 px-3 py-2 text-[11px] text-zinc-500">
        <span>{listeningHint}</span>
        {uploadPending && (
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <Loader2 size={11} className="animate-spin" />
            Uploading
          </span>
        )}
      </div>
    </div>
  );
}

function GenerateVariantsStatusCards({
  projectRequired,
  uploadErrorMessage,
  showError,
  activeVariantId,
  providerStatuses,
  isGenerating,
  doneCount,
  providersCount,
  errorCount,
}: Readonly<{
  projectRequired: boolean;
  uploadErrorMessage: string | null;
  showError: boolean;
  activeVariantId: number;
  providerStatuses: ProviderStatus[];
  isGenerating: boolean;
  doneCount: number;
  providersCount: number;
  errorCount: number;
}>) {
  return (
    <>
      {projectRequired && (
        <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
          Select a project to attach uploads or import from this project's
          Design Bank.
        </div>
      )}

      {showError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {uploadErrorMessage}
        </div>
      )}

      <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
        Source variant:{" "}
        <span className="font-medium text-zinc-100">#{activeVariantId}</span>
      </div>

      {providerStatuses.length > 0 && (
        <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
          {isGenerating
            ? `Generating... ${doneCount}/${providersCount} complete`
            : `Done: ${doneCount} success, ${errorCount} failed`}
        </div>
      )}
    </>
  );
}

function GenerateVariantsDesignBankDialog({
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
  attachments: PromptAttachment[];
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
      showSourceStatus
      showDoneButton
    />
  );
}

export function GenerateVariantsPanel() {
  const target = useCanvasStore((s) => s.contextualAiTarget);
  const slides = useCanvasStore((s) => s.slides);
  const config = useCanvasStore((s) => s.config);
  const setConfig = useCanvasStore((s) => s.setConfig);
  const editor = useCanvasStore((s) => s.editor);
  const closeContextualAi = useCanvasStore((s) => s.closeContextualAi);
  const addGeneratedVariantToSlide = useCanvasStore(
    (s) => s.addGeneratedVariantToSlide,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftsRef =
    useRef<Record<string, GenerateVariantsDraft>>(readStoredDrafts());
  const hydratedSlideIdRef = useRef<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [creativeRange, setCreativeRange] = useState<CreativeRange>("explore");
  const [selectedAspects, setSelectedAspects] = useState<VariantAspect[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>(
    [],
  );
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [isDesignBankOpen, setIsDesignBankOpen] = useState(false);
  const [designBankSearch, setDesignBankSearch] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useStopKeyboardPropagation(panelRef);

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
      setAttachments((prev) => appendUniqueAttachment(prev, attachment));
    },
  });

  const slide = useMemo(
    () => (target ? slides.get(target.slideId) : undefined),
    [slides, target],
  );

  const activeVariant = useMemo(
    () =>
      slide?.variants.find((variant) => variant.id === slide.activeVariantId),
    [slide],
  );

  const providers = config.selectedProviders;
  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === config.projectId) ?? null,
    [projects, config.projectId],
  );

  const filteredDesignBankSources = useMemo(
    () => filterDesignBankSources(designBankSources, designBankSearch),
    [designBankSearch, designBankSources],
  );

  const supportsSpeechRecognition =
    typeof globalThis !== "undefined" &&
    Boolean(
      "SpeechRecognition" in globalThis ||
      "webkitSpeechRecognition" in globalThis,
    );

  useGenerateVariantsDraftLifecycle({
    target,
    editor,
    draftsRef,
    hydratedSlideIdRef,
    instruction,
    creativeRange,
    selectedAspects,
    attachments,
    setInstruction,
    setCreativeRange,
    setSelectedAspects,
    setAttachments,
    setSpeechError,
    recognitionRef,
  });

  const toggleAspect = useCallback((aspect: VariantAspect) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect)
        ? prev.filter((a) => a !== aspect)
        : [...prev, aspect],
    );
  }, []);

  const updateProviderStatus = useCallback(
    (provider: string, patch: Partial<ProviderStatus>) => {
      setProviderStatuses((prev) =>
        prev.map((ps) => (ps.provider === provider ? { ...ps, ...patch } : ps)),
      );
    },
    [],
  );

  const {
    handleRemoveAttachment,
    handleAttachSource,
    handleProjectChange,
    handleUploadFromComputer,
    handleFileChange,
  } = useGenerateVariantsAttachmentHandlers({
    setConfig,
    projectId: config.projectId,
    fileInputRef,
    uploadMutation,
    setAttachments,
    setDesignBankSearch,
  });

  const handleSpeechToText = useGenerateVariantsSpeechHandler({
    recognitionRef,
    isListening,
    supportsSpeechRecognition,
    setSpeechError,
    setIsListening,
    setInstruction,
  });

  const handleGenerate = useCallback(async () => {
    const currentTarget = target;
    const sourceVariant = activeVariant;
    if (!currentTarget || !sourceVariant || providers.length === 0) return;

    setIsGenerating(true);
    setProviderStatuses(
      buildInitialProviderStatuses(providers, config.selectedModels),
    );

    const prompt = buildVariantsPrompt(
      sourceVariant.html,
      instruction,
      creativeRange,
      selectedAspects,
      attachments,
    );

    await runVariantGenerationStreams({
      slideId: currentTarget.slideId,
      providers,
      selectedModels: config.selectedModels,
      projectId: config.projectId,
      formatKey: config.formatKey,
      network: config.network,
      prompt,
      instruction,
      creativeRange,
      selectedAspects,
      sourceVariantId: sourceVariant.id,
      updateProviderStatus,
      addGeneratedVariantToSlide,
    });
    setIsGenerating(false);
  }, [
    target,
    activeVariant,
    providers,
    config,
    instruction,
    creativeRange,
    selectedAspects,
    attachments,
    addGeneratedVariantToSlide,
    updateProviderStatus,
  ]);

  if (target?.mode !== "generate-variants" || !slide || !activeVariant)
    return null;

  const canOpenAttachmentActions = config.projectId !== null;
  const {
    doneCount,
    errorCount,
    attachmentSummary,
    speechButtonTitle,
    listeningHint,
    uploadErrorMessage,
    generateButtonLabel,
  } = getGenerateVariantsUiState({
    providerStatuses,
    providersCount: providers.length,
    attachmentsCount: attachments.length,
    supportsSpeechRecognition,
    isListening,
    speechError,
    uploadError: uploadMutation.isError ? uploadMutation.error : null,
    isGenerating,
    isUploadPending: uploadMutation.isPending,
  });

  return (
    <aside
      ref={panelRef}
      className="w-[360px] border-l border-zinc-800/60 bg-zinc-950/92 backdrop-blur-xl"
    >
      <GenerateVariantsHeader
        providersCount={providers.length}
        onClose={closeContextualAi}
      />

      <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-y-auto p-4">
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
        />

        <GenerateVariantsOptions
          creativeRange={creativeRange}
          setCreativeRange={setCreativeRange}
          selectedAspects={selectedAspects}
          toggleAspect={toggleAspect}
          providers={providers}
          providerStatuses={providerStatuses}
        />

        <GenerateVariantsPromptCard
          selectedProjectName={selectedProject?.name ?? null}
          attachmentSummary={attachmentSummary}
          instruction={instruction}
          setInstruction={setInstruction}
          attachments={attachments}
          handleRemoveAttachment={handleRemoveAttachment}
          canOpenAttachmentActions={canOpenAttachmentActions}
          uploadPending={uploadMutation.isPending}
          handleUploadFromComputer={handleUploadFromComputer}
          openDesignBank={() => setIsDesignBankOpen(true)}
          projects={projects}
          projectId={config.projectId}
          handleProjectChange={handleProjectChange}
          handleSpeechToText={handleSpeechToText}
          supportsSpeechRecognition={supportsSpeechRecognition}
          isListening={isListening}
          speechButtonTitle={speechButtonTitle}
          listeningHint={listeningHint}
        />

        <GenerateVariantsStatusCards
          projectRequired={config.projectId === null}
          uploadErrorMessage={uploadErrorMessage}
          showError={uploadMutation.isError || speechError !== null}
          activeVariantId={activeVariant.id}
          providerStatuses={providerStatuses}
          isGenerating={isGenerating}
          doneCount={doneCount}
          providersCount={providers.length}
          errorCount={errorCount}
        />

        {/* Generate button */}
        <Button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={
            isGenerating || providers.length === 0 || uploadMutation.isPending
          }
          className="w-full justify-center rounded-lg bg-zinc-50 text-zinc-900 shadow-none hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {generateButtonLabel}
        </Button>
      </div>

      <GenerateVariantsDesignBankDialog
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
    </aside>
  );
}
