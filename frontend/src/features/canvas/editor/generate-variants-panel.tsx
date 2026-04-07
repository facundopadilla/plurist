import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  FileUp,
  FolderOpen,
  ImageIcon,
  Layers,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Search,
  Type,
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
import type {
  CreativeRange,
  VariantAspect,
  VariantGenerationMeta,
  VariantType,
} from "../types";

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

interface ProviderStatus {
  provider: string;
  modelId: string;
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
  errorCode?: string;
  errorHint?: string;
  errorRetryable?: boolean;
}

interface PromptAttachment {
  id: string;
  sourceId?: number;
  name: string;
  sourceType: string;
  description: string;
  origin: "upload" | "design-bank";
  url?: string;
}

interface GenerateVariantsDraft {
  instruction: string;
  creativeRange: CreativeRange;
  selectedAspects: VariantAspect[];
  attachments: PromptAttachment[];
  updatedAt: number;
}

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
    .map(
      (attachment, index) =>
        `${index + 1}. ${attachment.name} [${attachment.sourceType}]${attachment.url ? ` URL: ${attachment.url}` : ""}${attachment.description ? ` Notes: ${attachment.description}` : ""}`,
    )
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

function createAttachmentFromSource(
  source: DesignBankSource,
  origin: PromptAttachment["origin"],
): PromptAttachment {
  const lowerType = source.source_type.toLowerCase();
  const hasFile = Boolean(source.storage_key);

  return {
    id: `${origin}-${source.id}`,
    sourceId: source.id,
    name: source.name || source.original_filename || `Source #${source.id}`,
    sourceType: source.source_type,
    description: summarizeSource(source),
    origin,
    url:
      hasFile &&
      ["image", "jpg", "jpeg", "png", "gif", "svg", "webp", "logo"].includes(
        lowerType,
      )
        ? getSourceFileUrl(source.id)
        : source.url || undefined,
  };
}

function attachmentIcon(sourceType: string) {
  const lowerType = sourceType.toLowerCase();
  if (
    ["image", "jpg", "jpeg", "png", "gif", "svg", "webp", "logo"].includes(
      lowerType,
    )
  ) {
    return <ImageIcon size={12} />;
  }

  return <Type size={12} />;
}

function projectTriggerLabel(projects: Project[], projectId: number | null) {
  const project = projects.find((entry) => entry.id === projectId);
  return project ? project.name : "Project";
}

function attachmentOriginLabel(origin: PromptAttachment["origin"]) {
  return origin === "upload" ? "Uploaded" : "Design Bank";
}

function isImageSourceType(sourceType: string) {
  return ["image", "jpg", "jpeg", "png", "gif", "svg", "webp", "logo"].includes(
    sourceType.toLowerCase(),
  );
}

function readStoredDrafts() {
  if (typeof window === "undefined")
    return {} as Record<string, GenerateVariantsDraft>;

  try {
    const raw = window.sessionStorage.getItem(GENERATE_VARIANTS_DRAFTS_KEY);
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
  if (typeof window === "undefined") return;

  try {
    const now = Date.now();
    const prunedDrafts = Object.fromEntries(
      Object.entries(drafts).filter(([, draft]) => {
        if (typeof draft.updatedAt !== "number") return true;
        return now - draft.updatedAt < GENERATE_VARIANTS_DRAFT_TTL_MS;
      }),
    );
    window.sessionStorage.setItem(
      GENERATE_VARIANTS_DRAFTS_KEY,
      JSON.stringify(prunedDrafts),
    );
  } catch {
    // Ignore session storage write failures.
  }
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
    if (!editor || !target || target.mode !== "generate-variants") return;
    editor.select();
  }, [editor, target]);

  useEffect(() => {
    if (!target || target.mode !== "generate-variants") return;

    const draft = draftsRef.current[target.slideId];
    hydratedSlideIdRef.current = target.slideId;
    setInstruction(draft?.instruction ?? "");
    setCreativeRange(draft?.creativeRange ?? "explore");
    setSelectedAspects(draft?.selectedAspects ?? []);
    setAttachments(draft?.attachments ?? []);
    setSpeechError(null);
  }, [target]);

  useEffect(() => {
    if (!target || target.mode !== "generate-variants") return;
    if (hydratedSlideIdRef.current !== target.slideId) return;

    draftsRef.current = {
      ...draftsRef.current,
      [target.slideId]: {
        instruction,
        creativeRange,
        selectedAspects,
        attachments,
        updatedAt: Date.now(),
      },
    };
    writeStoredDrafts(draftsRef.current);
  }, [attachments, creativeRange, instruction, selectedAspects, target]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((entry) => entry.id !== attachmentId));
  }, []);

  const handleAttachSource = useCallback((source: DesignBankSource) => {
    const attachment = createAttachmentFromSource(source, "design-bank");
    setAttachments((prev) =>
      prev.some((entry) => entry.id === attachment.id)
        ? prev
        : [...prev, attachment],
    );
  }, []);

  const handleProjectChange = useCallback(
    (projectId: number | null) => {
      setConfig({ projectId });
      setAttachments([]);
      setDesignBankSearch("");
    },
    [setConfig],
  );

  const handleUploadFromComputer = useCallback(() => {
    if (config.projectId === null || uploadMutation.isPending) return;
    fileInputRef.current?.click();
  }, [config.projectId, uploadMutation.isPending]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      uploadMutation.mutate(file);
      event.target.value = "";
    },
    [uploadMutation],
  );

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

      setInstruction((prev) => {
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

  const handleGenerate = useCallback(async () => {
    const currentTarget = target;
    const sourceVariant = activeVariant;
    if (!currentTarget || !sourceVariant || providers.length === 0) return;

    setIsGenerating(true);

    const initialStatuses: ProviderStatus[] = providers.map((provider) => ({
      provider,
      modelId: config.selectedModels?.[provider] ?? "",
      status: "streaming",
    }));
    setProviderStatuses(initialStatuses);

    const prompt = buildVariantsPrompt(
      sourceVariant.html,
      instruction,
      creativeRange,
      selectedAspects,
      attachments,
    );

    const streamPromises = providers.map(async (provider) => {
      const modelId = config.selectedModels?.[provider] ?? "";
      let inserted = false;

      try {
        await streamChatMessage(
          {
            conversationId: useCanvasStore.getState().conversationId,
            messages: [{ role: "user", content: prompt }],
            provider,
            modelId,
            projectId: config.projectId,
            formatKey: config.formatKey,
            network: config.network,
            mode: "build",
          },
          {
            onToken: () => {},
            onHtmlBlock: (_slideIndex, html) => {
              if (inserted) return;
              inserted = true;
              const metadata: VariantGenerationMeta = {
                sourcePrompt: instruction.trim(),
                sourceVariantId: sourceVariant.id,
                mode: "generate-variants",
                provider,
                modelId,
                variantType: "default" as VariantType,
                derivedFromVariantId: sourceVariant.id,
                variantName: `${provider} variant`,
                creativeRange,
                aspects: selectedAspects,
              };
              addGeneratedVariantToSlide(
                currentTarget.slideId,
                html,
                provider,
                modelId,
                metadata,
              );
            },
            onElementPatch: () => {},
            onDone: () => {
              updateProviderStatus(provider, {
                status: inserted ? "done" : "error",
                error: inserted ? undefined : "No usable HTML returned",
              });
            },
            onError: (error) => {
              updateProviderStatus(provider, {
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
        updateProviderStatus(provider, {
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
          errorCode: "unknown",
        });
      }
    });

    await Promise.allSettled(streamPromises);
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

  if (
    !target ||
    target.mode !== "generate-variants" ||
    !slide ||
    !activeVariant
  )
    return null;

  const doneCount = providerStatuses.filter(
    (ps) => ps.status === "done",
  ).length;
  const errorCount = providerStatuses.filter(
    (ps) => ps.status === "error",
  ).length;
  const canOpenAttachmentActions = config.projectId !== null;
  const attachmentSummary =
    attachments.length === 0
      ? "No prompt attachments"
      : `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} ready`;

  return (
    <aside
      className="w-[360px] border-l border-zinc-800/60 bg-zinc-950/92 backdrop-blur-xl"
      onKeyDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onKeyUp={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-zinc-300" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-50">
              Generate Variants
            </h3>
            <p className="text-xs text-zinc-400">
              Create {providers.length} variations using all selected providers
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeContextualAi}
          aria-label="Close generate variants"
          className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-y-auto p-4">
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Creative Range */}
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-400">
            Creative Range
          </label>
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

        {/* Aspects */}
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-400">
            Aspects to vary <span className="text-zinc-600">(optional)</span>
          </label>
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

        {/* Provider list */}
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-400">
            Providers ({providers.length})
          </label>
          <div className="space-y-2">
            {providers.map((provider) => {
              const ps = providerStatuses.find((s) => s.provider === provider);
              return (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/70 px-3 py-2"
                >
                  <span className="text-xs font-medium capitalize text-zinc-200">
                    {provider}
                  </span>
                  {ps?.status === "streaming" && (
                    <Loader2 size={14} className="animate-spin text-zinc-400" />
                  )}
                  {ps?.status === "done" && (
                    <Check size={14} className="text-emerald-400" />
                  )}
                  {ps?.status === "error" && (
                    <span
                      className="flex items-center gap-1 text-[10px] text-red-400"
                      title={ps.errorHint || ps.error}
                    >
                      <AlertCircle size={12} />
                      {ps.errorCode && ps.errorCode !== "unknown"
                        ? ps.errorCode.replace(/_/g, " ")
                        : "Failed"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Instruction */}
        <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/80">
          <div className="flex items-center justify-between border-b border-zinc-800/70 px-3 py-2 text-[11px] text-zinc-500">
            <div className="flex min-w-0 items-center gap-2">
              <FolderOpen size={12} />
              <span className="truncate">
                {selectedProject
                  ? `Project: ${selectedProject.name}`
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

          {attachments.length > 0 && (
            <div className="space-y-2 border-t border-zinc-800/70 px-3 py-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-start gap-3 rounded-md border border-zinc-800/70 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200"
                >
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800/70 bg-zinc-950/80 text-zinc-500">
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
                      !canOpenAttachmentActions || uploadMutation.isPending
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

            <button
              type="button"
              onClick={handleSpeechToText}
              disabled={!supportsSpeechRecognition && !isListening}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/70 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-600"
              aria-label="Speech to text"
              title={
                supportsSpeechRecognition
                  ? isListening
                    ? "Stop listening"
                    : "Start speech to text"
                  : "Speech to text is not available"
              }
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800/70 px-3 py-2 text-[11px] text-zinc-500">
            <span>
              {isListening
                ? "Listening... speak naturally and we will append the transcript."
                : "Attachments are added as prompt context only."}
            </span>
            {uploadMutation.isPending && (
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Loader2 size={11} className="animate-spin" />
                Uploading
              </span>
            )}
          </div>
        </div>

        {config.projectId === null && (
          <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
            Select a project to attach uploads or import from this project's
            Design Bank.
          </div>
        )}

        {(uploadMutation.isError || speechError) && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {uploadMutation.isError
              ? uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : "Upload failed"
              : speechError}
          </div>
        )}

        {/* Active variant info */}
        <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
          Source variant:{" "}
          <span className="font-medium text-zinc-100">#{activeVariant.id}</span>
        </div>

        {/* Progress summary */}
        {providerStatuses.length > 0 && (
          <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3 text-xs text-zinc-400">
            {isGenerating
              ? `Generating... ${doneCount}/${providers.length} complete`
              : `Done: ${doneCount} success, ${errorCount} failed`}
          </div>
        )}

        {/* Generate button */}
        <Button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={
            isGenerating || providers.length === 0 || uploadMutation.isPending
          }
          className="w-full justify-center rounded-lg bg-zinc-50 text-zinc-900 shadow-none hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isGenerating
            ? `Generating ${providers.length} variants...`
            : uploadMutation.isPending
              ? "Waiting for upload..."
              : `Generate ${providers.length} variants`}
        </Button>
      </div>

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
                      {source.status && (
                        <p className="mt-1 text-[11px] text-zinc-600">
                          Status: {source.status}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {alreadyAttached ? "Attached" : "Attach"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDesignBankOpen(false)}
                className="h-8 rounded-md px-3 text-xs text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-50"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
