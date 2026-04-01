import { create, type StateCreator } from "zustand";
import type {
  Annotation,
  ChatMessage,
  CanvasConfig,
  ContextualAiMode,
  NetworkId,
  PanelId,
  ResponsiveVariantType,
  SlideData,
  VariantGenerationMeta,
} from "./types";
import type { DraftFrameMetadata, DraftVariant } from "../content/types";
import type { Editor, TLShapeId } from "tldraw";
import {
  createTldrawShape as createTldrawShapeBase,
  removeTldrawShape as removeTldrawShapeBase,
  syncShapeHtmlOrCreate as syncShapeHtmlOrCreateBase,
  toShapeId as toShapeIdBase,
  updateTldrawShapeHtml as updateTldrawShapeHtmlBase,
} from "./canvas-store-shapes";
import {
  createDefaultVariant as createDefaultVariantBase,
  createSlideData as createSlideDataBase,
  getNextVariantId as getNextVariantIdBase,
  normalizeDraftVariant as normalizeDraftVariantBase,
} from "./canvas-store-variants";
import { shouldHydrateDraft as shouldHydrateDraftBase } from "./canvas-store-persistence";

interface CanvasStore {
  // tldraw editor ref (set once on mount via onMount callback)
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Slides data (source of truth for content)
  slides: Map<string, SlideData>;

  // Config
  config: CanvasConfig;
  setConfig: (partial: Partial<CanvasConfig>) => void;
  hydrateDraft: (payload: {
    frameMetadata: DraftFrameMetadata[];
    variants: DraftVariant[];
  }) => void;

  // Slide actions
  addSlide: (
    slideIndex: number,
    html: string,
    provider: string,
    variantId: number,
    modelId?: string,
  ) => string;
  addSlideFromChat: (
    slideIndex: number,
    html: string,
    provider: string,
  ) => void;
  updateSlideVariant: (
    slideIndex: number,
    html: string,
    provider: string,
  ) => void;
  setActiveVariant: (slideId: string, variantId: number) => void;
  removeSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => string | null;
  renameSlide: (slideId: string, name: string) => void;
  toggleSlideFavorite: (slideId: string) => void;
  addSlideAnnotation: (slideId: string, text: string) => string | null;
  updateSlideAnnotation: (
    slideId: string,
    annotationId: string,
    text: string,
  ) => void;
  removeSlideAnnotation: (slideId: string, annotationId: string) => void;
  renameVariant: (slideId: string, variantId: number, name: string) => void;
  removeVariant: (slideId: string, variantId: number) => void;
  duplicateVariant: (slideId: string, variantId: number) => number | null;
  addGeneratedVariantToSlide: (
    slideId: string,
    html: string,
    provider: string,
    modelId: string,
    generationMeta?: VariantGenerationMeta,
  ) => number | null;
  getResponsiveVariantForSlide: (
    slideId: string,
    variantType: ResponsiveVariantType,
  ) => number | null;
  replaceResponsiveVariant: (
    slideId: string,
    variantType: ResponsiveVariantType,
    html: string,
    provider: string,
    modelId: string,
    generationMeta?: VariantGenerationMeta,
  ) => number | null;
  updateSlideHtml: (
    slideId: string,
    variantId: number,
    newHtml: string,
  ) => void;

  // Chat state
  conversationId: number | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  chatMode: "plan" | "build";
  setConversationId: (id: number | null) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (patch: Partial<ChatMessage>) => void;
  setIsStreaming: (v: boolean) => void;
  setChatMode: (mode: "plan" | "build") => void;

  // Edit state
  editingNodeId: string | null;
  enterEditMode: (nodeId: string) => void;
  exitEditMode: () => void;
  annotationEditorSlideId: string | null;
  openAnnotationEditor: (slideId: string) => void;
  closeAnnotationEditor: () => void;
  contextualAiTarget: { slideId: string; mode: ContextualAiMode } | null;
  openContextualAi: (slideId: string, mode: ContextualAiMode) => void;
  closeContextualAi: () => void;

  // Panel navigation
  activePanel: PanelId | null;
  resetActivePanel: () => void;
  togglePanel: (panel: PanelId) => void;

  // Persistence
  draftPostId: number | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
  setDraftPostId: (id: number | null) => void;
  markDirty: () => void;
  markSaved: () => void;

  // Derived: count of slides (replaces nodes.length for load guards)
  slideCount: () => number;
}

let slideCounter = 0;
let annotationCounter = 0;

function makeSlideId(): string {
  slideCounter += 1;
  return `slide-${Date.now()}-${slideCounter}`;
}

function makeAnnotationId(): string {
  annotationCounter += 1;
  return `annotation-${Date.now()}-${annotationCounter}`;
}

function getNextVariantId(variants: SlideData["variants"]): number {
  return getNextVariantIdBase(variants);
}

function createDefaultVariant(
  id: number,
  provider: string,
  html: string,
  modelId = "",
) {
  return createDefaultVariantBase(id, provider, html, modelId);
}

function createSlideData(
  slideIndex: number,
  variants: SlideData["variants"],
  activeVariantId: number | null,
): SlideData {
  return createSlideDataBase(slideIndex, variants, activeVariantId);
}

function normalizeDraftVariant(variant: DraftVariant) {
  return normalizeDraftVariantBase(variant);
}

function syncShapeHtmlOrCreate(
  editor: Editor | null,
  slideId: string,
  slideIndex: number,
  html: string,
  config: CanvasConfig,
) {
  return syncShapeHtmlOrCreateBase(editor, slideId, slideIndex, html, config);
}

/**
 * Convert a slideId string to a branded TLShapeId.
 * tldraw v4 requires branded IDs — createShapeId('x') produces `shape:x`.
 */
function toShapeId(slideId: string): TLShapeId {
  return toShapeIdBase(slideId);
}

/**
 * Create an HTML shape in the tldraw editor for the given slide.
 */
function createTldrawShape(
  editor: Editor | null,
  slideId: string,
  slideIndex: number,
  html: string,
  formatWidth: number,
  formatHeight: number,
  position?: { x: number; y: number },
): void {
  return createTldrawShapeBase(
    editor,
    slideId,
    slideIndex,
    html,
    formatWidth,
    formatHeight,
    position,
  );
}

/**
 * Remove a shape from the tldraw editor by slideId.
 */
function removeTldrawShape(editor: Editor | null, slideId: string): void {
  return removeTldrawShapeBase(editor, slideId);
}

/**
 * Update the html prop of an existing tldraw shape.
 * Returns true if the shape was found and updated, false otherwise.
 */
function updateTldrawShapeHtml(
  editor: Editor | null,
  slideId: string,
  html: string,
): boolean {
  return updateTldrawShapeHtmlBase(editor, slideId, html);
}

function shouldHydrateDraft(
  currentSlides: Map<string, SlideData>,
  frameMetadata: DraftFrameMetadata[],
  variants: DraftVariant[],
) {
  return shouldHydrateDraftBase(currentSlides, frameMetadata, variants);
}

type CanvasSet = Parameters<StateCreator<CanvasStore>>[0];
type CanvasGet = Parameters<StateCreator<CanvasStore>>[1];

const defaultConfig: CanvasConfig = {
  projectId: null,
  network: null,
  formatKey: "ig_square",
  formatWidth: 1080,
  formatHeight: 1080,
  selectedProviders: ["openai", "anthropic", "gemini"],
  selectedModels: {},
  title: "",
};

function createConfigSlice(
  set: CanvasSet,
): Pick<CanvasStore, "config" | "setConfig"> {
  return {
    config: defaultConfig,
    setConfig: (partial) =>
      set((state: CanvasStore) => ({
        config: { ...state.config, ...partial },
      })),
  };
}

function createChatSlice(
  set: CanvasSet,
): Pick<
  CanvasStore,
  | "conversationId"
  | "messages"
  | "isStreaming"
  | "chatMode"
  | "setConversationId"
  | "addMessage"
  | "updateLastMessage"
  | "setIsStreaming"
  | "setChatMode"
> {
  return {
    conversationId: null,
    messages: [],
    isStreaming: false,
    chatMode: "build",
    setConversationId: (id) => set({ conversationId: id }),
    addMessage: (msg) =>
      set((state: CanvasStore) => ({ messages: [...state.messages, msg] })),
    updateLastMessage: (patch) =>
      set((state: CanvasStore) => {
        const msgs = [...state.messages];
        if (msgs.length === 0) return {};
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
        return { messages: msgs };
      }),
    setIsStreaming: (v) => set({ isStreaming: v }),
    setChatMode: (mode) => set({ chatMode: mode }),
  };
}

function createUiSlice(
  set: CanvasSet,
): Pick<
  CanvasStore,
  | "editingNodeId"
  | "enterEditMode"
  | "exitEditMode"
  | "annotationEditorSlideId"
  | "openAnnotationEditor"
  | "closeAnnotationEditor"
  | "contextualAiTarget"
  | "openContextualAi"
  | "closeContextualAi"
  | "activePanel"
  | "resetActivePanel"
  | "togglePanel"
> {
  return {
    editingNodeId: null,
    enterEditMode: (nodeId) => set({ editingNodeId: nodeId }),
    exitEditMode: () => set({ editingNodeId: null }),
    annotationEditorSlideId: null,
    openAnnotationEditor: (slideId) =>
      set({ annotationEditorSlideId: slideId }),
    closeAnnotationEditor: () => set({ annotationEditorSlideId: null }),
    contextualAiTarget: null,
    openContextualAi: (slideId, mode) =>
      set({ contextualAiTarget: { slideId, mode } }),
    closeContextualAi: () => set({ contextualAiTarget: null }),
    activePanel: "chat",
    resetActivePanel: () => set({ activePanel: "chat" }),
    togglePanel: (panel) =>
      set((state: CanvasStore) => ({
        activePanel: state.activePanel === panel ? null : panel,
      })),
  };
}

function createPersistenceSlice(
  set: CanvasSet,
  get: CanvasGet,
): Pick<
  CanvasStore,
  | "draftPostId"
  | "isDirty"
  | "lastSavedAt"
  | "setDraftPostId"
  | "markDirty"
  | "markSaved"
  | "slideCount"
> {
  return {
    draftPostId: null,
    isDirty: false,
    lastSavedAt: null,
    setDraftPostId: (id) => set({ draftPostId: id }),
    markDirty: () => set({ isDirty: true }),
    markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),
    slideCount: () => get().slides.size,
  };
}

function createSlidesSlice(
  set: CanvasSet,
  get: CanvasGet,
): Pick<
  CanvasStore,
  | "slides"
  | "hydrateDraft"
  | "addSlide"
  | "addSlideFromChat"
  | "updateSlideVariant"
  | "setActiveVariant"
  | "removeSlide"
  | "duplicateSlide"
  | "renameSlide"
  | "toggleSlideFavorite"
  | "addSlideAnnotation"
  | "updateSlideAnnotation"
  | "removeSlideAnnotation"
  | "renameVariant"
  | "removeVariant"
  | "duplicateVariant"
  | "addGeneratedVariantToSlide"
  | "getResponsiveVariantForSlide"
  | "replaceResponsiveVariant"
  | "updateSlideHtml"
> {
  return {
    slides: new Map(),

    hydrateDraft: ({ frameMetadata, variants }) => {
      const {
        editor,
        config,
        slides: currentSlides,
        editingNodeId,
        annotationEditorSlideId,
        contextualAiTarget,
      } = get();
      const grouped = new Map<number, DraftVariant[]>();
      for (const variant of variants) {
        const slideIndex = variant.slide_index ?? 0;
        if (!grouped.has(slideIndex)) grouped.set(slideIndex, []);
        grouped.get(slideIndex)!.push(variant);
      }

      const frameByIndex = new Map(
        frameMetadata.map((frame) => [frame.slide_index, frame]),
      );
      const newSlides = new Map<string, SlideData>();
      const currentSlideEntries = Array.from(currentSlides.entries());
      const previousSlideIdByIndex = new Map(
        currentSlideEntries.map(([slideId, slide]) => [
          slide.slideIndex,
          slideId,
        ]),
      );
      const selectedShapeIds =
        editor?.getSelectedShapes?.().map((shape) => String(shape.id)) ?? [];
      const selectedSlideIds = new Set(
        selectedShapeIds
          .map(
            (shapeId) =>
              currentSlideEntries.find(
                ([slideId]) => String(toShapeId(slideId)) === shapeId,
              )?.[0],
          )
          .filter((slideId): slideId is string => Boolean(slideId)),
      );

      if (!shouldHydrateDraft(currentSlides, frameMetadata, variants)) {
        return;
      }

      if (editor) {
        for (const [slideId, slide] of currentSlideEntries) {
          if (!grouped.has(slide.slideIndex)) {
            removeTldrawShape(editor, slideId);
            continue;
          }
          const nextVariant = grouped.get(slide.slideIndex)?.at(-1);
          if (nextVariant) {
            updateTldrawShapeHtml(editor, slideId, nextVariant.generated_html);
          }
        }
      }

      for (const slideIndex of Array.from(grouped.keys()).sort(
        (a, b) => a - b,
      )) {
        const slideId = previousSlideIdByIndex.get(slideIndex) ?? makeSlideId();
        const slideVariants = grouped.get(slideIndex)!;
        const frame = frameByIndex.get(slideIndex);
        const normalizedVariants = slideVariants.map(normalizeDraftVariant);
        const activeVariant =
          normalizedVariants[normalizedVariants.length - 1] ?? null;

        newSlides.set(slideId, {
          slideIndex,
          variants: normalizedVariants,
          activeVariantId: activeVariant?.id ?? null,
          name: frame?.name || `Frame ${slideIndex + 1}`,
          isFavorite: frame?.is_favorite ?? false,
          annotations: frame?.annotations ?? [],
          generationMeta: activeVariant?.generationMeta,
        });

        createTldrawShape(
          editor,
          slideId,
          slideIndex,
          activeVariant?.html ?? "",
          config.formatWidth,
          config.formatHeight,
        );
      }

      set({
        slides: newSlides,
        editingNodeId:
          editingNodeId &&
          Array.from(newSlides.keys()).some(
            (slideId) => String(toShapeId(slideId)) === editingNodeId,
          )
            ? editingNodeId
            : null,
        annotationEditorSlideId:
          annotationEditorSlideId && newSlides.has(annotationEditorSlideId)
            ? annotationEditorSlideId
            : null,
        contextualAiTarget:
          contextualAiTarget && newSlides.has(contextualAiTarget.slideId)
            ? contextualAiTarget
            : null,
      });

      if (editor && selectedSlideIds.size > 0) {
        const nextSelectedShapeIds = Array.from(newSlides.keys())
          .filter((slideId) => selectedSlideIds.has(slideId))
          .map((slideId) => toShapeId(slideId));
        if (nextSelectedShapeIds.length > 0) {
          editor.select(...nextSelectedShapeIds);
        }
      }
    },

    addSlide: (slideIndex, html, provider, variantId, modelId = "") => {
      const slideId = makeSlideId();
      const { config, editor } = get();
      const slideData = createSlideData(
        slideIndex,
        [createDefaultVariant(variantId, provider, html, modelId)],
        variantId,
      );

      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, slideData);
        return { slides: newSlides, isDirty: true };
      });

      createTldrawShape(
        editor,
        slideId,
        slideIndex,
        html,
        config.formatWidth,
        config.formatHeight,
      );
      return slideId;
    },

    addSlideFromChat: (slideIndex, html, provider) => {
      const { slides, config, editor } = get();
      const existingEntry = Array.from(slides.entries()).find(
        ([, data]) => data.slideIndex === slideIndex,
      );

      if (existingEntry) {
        const [existingSlideId, existingData] = existingEntry;
        const nextId = getNextVariantId(existingData.variants);
        const newVariant = createDefaultVariant(nextId, provider, html);
        set((state: CanvasStore) => {
          const newSlides = new Map(state.slides);
          const current = newSlides.get(existingSlideId);
          if (current) {
            newSlides.set(existingSlideId, {
              ...current,
              variants: [...current.variants, newVariant],
              activeVariantId: nextId,
            });
          }
          return { slides: newSlides, isDirty: true };
        });
        syncShapeHtmlOrCreate(
          editor,
          existingSlideId,
          existingData.slideIndex,
          html,
          config,
        );
        return;
      }

      const slideId = makeSlideId();
      const slideData = createSlideData(
        slideIndex,
        [createDefaultVariant(1, provider, html)],
        1,
      );
      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, slideData);
        return { slides: newSlides, isDirty: true };
      });
      createTldrawShape(
        editor,
        slideId,
        slideIndex,
        html,
        config.formatWidth,
        config.formatHeight,
      );
    },

    updateSlideVariant: (slideIndex, html, provider) => {
      const { editor, config } = get();
      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        for (const [id, data] of newSlides.entries()) {
          if (data.slideIndex !== slideIndex) continue;
          const existingIdx = data.variants.findIndex(
            (v) => v.provider === provider,
          );
          if (existingIdx >= 0) {
            const updatedVariants = [...data.variants];
            updatedVariants[existingIdx] = {
              ...updatedVariants[existingIdx],
              html,
            };
            newSlides.set(id, { ...data, variants: updatedVariants });
            if (data.activeVariantId === updatedVariants[existingIdx].id) {
              syncShapeHtmlOrCreate(editor, id, data.slideIndex, html, config);
            }
          } else {
            const nextId = getNextVariantId(data.variants);
            newSlides.set(id, {
              ...data,
              variants: [
                ...data.variants,
                createDefaultVariant(nextId, provider, html),
              ],
              activeVariantId: nextId,
            });
            syncShapeHtmlOrCreate(editor, id, data.slideIndex, html, config);
          }
          break;
        }
        return { slides: newSlides, isDirty: true };
      });
    },

    setActiveVariant: (slideId, variantId) => {
      const { editor } = get();
      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        const data = newSlides.get(slideId);
        if (data) {
          newSlides.set(slideId, { ...data, activeVariantId: variantId });
          const variant = data.variants.find((v) => v.id === variantId);
          if (variant) updateTldrawShapeHtml(editor, slideId, variant.html);
        }
        return { slides: newSlides };
      });
    },

    removeSlide: (slideId) => {
      const { editor } = get();
      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        newSlides.delete(slideId);
        return {
          annotationEditorSlideId:
            state.annotationEditorSlideId === slideId
              ? null
              : state.annotationEditorSlideId,
          contextualAiTarget:
            state.contextualAiTarget?.slideId === slideId
              ? null
              : state.contextualAiTarget,
          slides: newSlides,
          isDirty: true,
        };
      });
      removeTldrawShape(editor, slideId);
    },

    duplicateSlide: (slideId) => {
      const { editor, config, slides } = get();
      const sourceSlide = slides.get(slideId);
      if (!sourceSlide) return null;
      const nextSlideId = makeSlideId();
      const nextSlideIndex =
        Math.max(
          -1,
          ...Array.from(slides.values()).map((slide) => slide.slideIndex),
        ) + 1;
      const clonedVariants = sourceSlide.variants.map((variant) => ({
        ...variant,
      }));
      const activeVariant = clonedVariants.find(
        (variant) => variant.id === sourceSlide.activeVariantId,
      );
      const sourceShape = editor?.getShape(toShapeId(slideId));

      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        newSlides.set(nextSlideId, {
          slideIndex: nextSlideIndex,
          activeVariantId: sourceSlide.activeVariantId,
          variants: clonedVariants,
          name: sourceSlide.name
            ? `${sourceSlide.name} copy`
            : `Frame ${nextSlideIndex + 1}`,
          isFavorite: sourceSlide.isFavorite ?? false,
          annotations: [...(sourceSlide.annotations ?? [])],
        });
        return { slides: newSlides, isDirty: true };
      });

      createTldrawShape(
        editor,
        nextSlideId,
        nextSlideIndex,
        activeVariant?.html ?? clonedVariants[0]?.html ?? "",
        config.formatWidth,
        config.formatHeight,
        sourceShape
          ? { x: sourceShape.x + 64, y: sourceShape.y + 64 }
          : undefined,
      );

      return nextSlideId;
    },

    renameSlide: (slideId, name) => {
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, { ...slide, name });
        return { slides: newSlides, isDirty: true };
      });
    },

    toggleSlideFavorite: (slideId) => {
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, { ...slide, isFavorite: !slide.isFavorite });
        return { slides: newSlides, isDirty: true };
      });
    },

    addSlideAnnotation: (slideId, text) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const annotationId = makeAnnotationId();
      const annotation: Annotation = {
        id: annotationId,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          annotations: [...(slide.annotations ?? []), annotation],
        });
        return { slides: newSlides, isDirty: true };
      });
      return annotationId;
    },

    updateSlideAnnotation: (slideId, annotationId, text) => {
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          annotations: (slide.annotations ?? []).map((annotation) =>
            annotation.id === annotationId
              ? { ...annotation, text }
              : annotation,
          ),
        });
        return { slides: newSlides, isDirty: true };
      });
    },

    removeSlideAnnotation: (slideId, annotationId) => {
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          annotations: (slide.annotations ?? []).filter(
            (annotation) => annotation.id !== annotationId,
          ),
        });
        return { slides: newSlides, isDirty: true };
      });
    },

    renameVariant: (slideId, variantId, name) => {
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const trimmed = name.trim();
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          variants: slide.variants.map((variant) =>
            variant.id === variantId
              ? {
                  ...variant,
                  name: trimmed || undefined,
                  generationMeta: {
                    ...(variant.generationMeta ?? {}),
                    variantName: trimmed || undefined,
                  },
                }
              : variant,
          ),
        });
        return { slides: newSlides, isDirty: true };
      });
    },

    removeVariant: (slideId, variantId) => {
      const { editor } = get();
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide || slide.variants.length <= 1) return state;
        const remaining = slide.variants.filter(
          (variant) => variant.id !== variantId,
        );
        const activeVariantId =
          slide.activeVariantId === variantId
            ? (remaining[remaining.length - 1]?.id ?? null)
            : slide.activeVariantId;
        const activeVariant =
          remaining.find((variant) => variant.id === activeVariantId) ??
          remaining[0];
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          variants: remaining,
          activeVariantId,
          generationMeta: activeVariant?.generationMeta,
        });
        if (activeVariant)
          updateTldrawShapeHtml(editor, slideId, activeVariant.html);
        return { slides: newSlides, isDirty: true };
      });
    },

    duplicateVariant: (slideId, variantId) => {
      let duplicatedId: number | null = null;
      const { editor } = get();
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const source = slide.variants.find(
          (variant) => variant.id === variantId,
        );
        if (!source) return state;
        duplicatedId =
          Math.max(0, ...slide.variants.map((variant) => variant.id)) + 1;
        const duplicatedVariant = {
          ...source,
          id: duplicatedId,
          name: source.name ? `${source.name} copy` : undefined,
          generationMeta: {
            ...(source.generationMeta ?? {}),
            variantName: source.name ? `${source.name} copy` : undefined,
            derivedFromVariantId: source.id,
          },
          derivedFromVariantId: source.id,
        };
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          variants: [...slide.variants, duplicatedVariant],
          activeVariantId: duplicatedId,
          generationMeta: duplicatedVariant.generationMeta,
        });
        updateTldrawShapeHtml(editor, slideId, duplicatedVariant.html);
        return { slides: newSlides, isDirty: true };
      });
      return duplicatedId;
    },

    addGeneratedVariantToSlide: (
      slideId,
      html,
      provider,
      modelId,
      generationMeta,
    ) => {
      let nextVariantId: number | null = null;
      const { editor } = get();
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        nextVariantId =
          Math.max(0, ...slide.variants.map((variant) => variant.id)) + 1;
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          variants: [
            ...slide.variants,
            {
              id: nextVariantId,
              name: generationMeta?.variantName,
              provider,
              modelId,
              html,
              text: "",
              variantType: generationMeta?.variantType ?? "default",
              derivedFromVariantId:
                generationMeta?.derivedFromVariantId ?? null,
              generationMeta,
            },
          ],
          activeVariantId: nextVariantId,
          generationMeta,
        });
        return { slides: newSlides, isDirty: true };
      });
      if (nextVariantId !== null) updateTldrawShapeHtml(editor, slideId, html);
      return nextVariantId;
    },

    getResponsiveVariantForSlide: (slideId, variantType) => {
      const slide = get().slides.get(slideId);
      if (!slide) return null;
      const variant = slide.variants.find(
        (entry) => entry.variantType === variantType,
      );
      return variant?.id ?? null;
    },

    replaceResponsiveVariant: (
      slideId,
      variantType,
      html,
      provider,
      modelId,
      generationMeta,
    ) => {
      let resolvedId: number | null = null;
      const { editor } = get();
      set((state: CanvasStore) => {
        const slide = state.slides.get(slideId);
        if (!slide) return state;
        const existing = slide.variants.find(
          (variant) => variant.variantType === variantType,
        );
        if (!existing) return state;
        resolvedId = existing.id;
        const nextGenerationMeta = {
          ...(generationMeta ?? {}),
          variantType,
          derivedFromVariantId:
            generationMeta?.derivedFromVariantId ??
            existing.derivedFromVariantId ??
            null,
        };
        const updatedVariants = slide.variants.map((variant) =>
          variant.id === existing.id
            ? {
                ...variant,
                provider,
                modelId,
                html,
                generationMeta: nextGenerationMeta,
                variantType,
              }
            : variant,
        );
        const updatedVariant = updatedVariants.find(
          (variant) => variant.id === existing.id,
        );
        if (updatedVariant)
          updateTldrawShapeHtml(editor, slideId, updatedVariant.html);
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, {
          ...slide,
          variants: updatedVariants,
          activeVariantId: existing.id,
          generationMeta: nextGenerationMeta,
        });
        return { slides: newSlides, isDirty: true };
      });
      return resolvedId;
    },

    updateSlideHtml: (slideId, variantId, newHtml) => {
      const { editor } = get();
      set((state: CanvasStore) => {
        const newSlides = new Map(state.slides);
        const data = newSlides.get(slideId);
        if (data) {
          const updatedVariants = data.variants.map((v) =>
            v.id === variantId ? { ...v, html: newHtml } : v,
          );
          newSlides.set(slideId, { ...data, variants: updatedVariants });
          if (data.activeVariantId === variantId)
            updateTldrawShapeHtml(editor, slideId, newHtml);
        }
        return { slides: newSlides, isDirty: true };
      });
    },
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // tldraw editor
  editor: null,
  setEditor: (editor) => set({ editor }),

  ...createSlidesSlice(set, get),

  ...createConfigSlice(set),

  ...createChatSlice(set),
  ...createUiSlice(set),
  ...createPersistenceSlice(set, get),
}));

// Selector helpers (stable references)
export const selectConfig = (s: CanvasStore) => s.config;
export const selectSlide = (slideId: string) => (s: CanvasStore) =>
  s.slides.get(slideId);
export const selectMessages = (s: CanvasStore) => s.messages;
export const selectIsStreaming = (s: CanvasStore) => s.isStreaming;
export const selectActivePanel = (s: CanvasStore) => s.activePanel;

// Re-export NetworkId for convenience
export type { NetworkId };
