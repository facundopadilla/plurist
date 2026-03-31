import { create } from "zustand";
import type { SlideData, ChatMessage, CanvasConfig, NetworkId, PanelId } from "./types";
import { createShapeId, type Editor, type TLShapeId } from "tldraw";
import { IFRAME_SHAPE_TYPE } from "./shapes";

const SHAPE_WIDTH = 400;
const SHAPE_GAP = 48;

interface CanvasStore {
  // tldraw editor ref (set once on mount via onMount callback)
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Slides data (source of truth for content)
  slides: Map<string, SlideData>;

  // Config
  config: CanvasConfig;
  setConfig: (partial: Partial<CanvasConfig>) => void;

  // Slide actions
  addSlide: (slideIndex: number, html: string, provider: string, variantId: number, modelId?: string) => string;
  addSlideFromChat: (slideIndex: number, html: string, provider: string) => void;
  updateSlideVariant: (slideIndex: number, html: string, provider: string) => void;
  setActiveVariant: (slideId: string, variantId: number) => void;
  removeSlide: (slideId: string) => void;
  updateSlideHtml: (slideId: string, variantId: number, newHtml: string) => void;

  // Chat state
  conversationId: number | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  setConversationId: (id: number | null) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (patch: Partial<ChatMessage>) => void;
  setIsStreaming: (v: boolean) => void;

  // Edit state
  editingNodeId: string | null;
  enterEditMode: (nodeId: string) => void;
  exitEditMode: () => void;

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

function makeSlideId(): string {
  slideCounter += 1;
  return `slide-${Date.now()}-${slideCounter}`;
}

/**
 * Convert a slideId string to a branded TLShapeId.
 * tldraw v4 requires branded IDs — createShapeId('x') produces `shape:x`.
 */
function toShapeId(slideId: string): TLShapeId {
  return createShapeId(slideId);
}

/**
 * Create an iframe shape in the tldraw editor for the given slide.
 */
function createTldrawShape(
  editor: Editor | null,
  slideId: string,
  slideIndex: number,
  html: string,
  formatWidth: number,
  formatHeight: number,
): void {
  if (!editor) return;

  const shapeHeight = Math.round((formatHeight / formatWidth) * SHAPE_WIDTH);
  const x = slideIndex * (SHAPE_WIDTH + SHAPE_GAP);

  editor.createShape({
    id: toShapeId(slideId),
    type: IFRAME_SHAPE_TYPE,
    x,
    y: 0,
    props: {
      w: SHAPE_WIDTH,
      h: shapeHeight,
      html,
      slideId,
      slideIndex,
    },
  });
}

/**
 * Remove a shape from the tldraw editor by slideId.
 */
function removeTldrawShape(editor: Editor | null, slideId: string): void {
  if (!editor) return;
  const id = toShapeId(slideId);
  if (editor.getShape(id)) {
    editor.deleteShape(id);
  }
}

/**
 * Update the html prop of an existing tldraw shape.
 */
function updateTldrawShapeHtml(editor: Editor | null, slideId: string, html: string): void {
  if (!editor) return;
  const id = toShapeId(slideId);
  if (editor.getShape(id)) {
    editor.updateShape({
      id,
      type: IFRAME_SHAPE_TYPE,
      props: { html },
    });
  }
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // tldraw editor
  editor: null,
  setEditor: (editor) => set({ editor }),

  // Slides
  slides: new Map(),

  // Config defaults
  config: {
    projectId: null,
    network: null,
    formatKey: "ig_square",
    formatWidth: 1080,
    formatHeight: 1080,
    selectedProviders: ["openai", "anthropic", "gemini"],
    title: "",
  },
  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  // Slide actions
  addSlide: (slideIndex, html, provider, variantId, modelId = "") => {
    const slideId = makeSlideId();
    const { config, editor } = get();
    const slideData: SlideData = {
      variants: [{ id: variantId, provider, modelId, html, text: "" }],
      activeVariantId: variantId,
      slideIndex,
    };

    set((state) => {
      const newSlides = new Map(state.slides);
      newSlides.set(slideId, slideData);
      return {
        slides: newSlides,
        isDirty: true,
      };
    });

    // Create shape in tldraw (side effect, after state update)
    createTldrawShape(editor, slideId, slideIndex, html, config.formatWidth, config.formatHeight);

    return slideId;
  },

  addSlideFromChat: (slideIndex, html, provider) => {
    const { slides, config, editor } = get();

    // Check if a slide already exists for this slide index
    const existingEntry = Array.from(slides.entries()).find(
      ([, data]) => data.slideIndex === slideIndex,
    );

    if (existingEntry) {
      const [existingSlideId, existingData] = existingEntry;
      const nextId = Math.max(0, ...existingData.variants.map((v) => v.id)) + 1;
      const newVariant = { id: nextId, provider, modelId: "", html, text: "" };
      set((state) => {
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
      // Update the shape HTML to the new active variant
      updateTldrawShapeHtml(editor, existingSlideId, html);
    } else {
      const slideId = makeSlideId();
      const slideData: SlideData = {
        variants: [{ id: 1, provider, modelId: "", html, text: "" }],
        activeVariantId: 1,
        slideIndex,
      };

      set((state) => {
        const newSlides = new Map(state.slides);
        newSlides.set(slideId, slideData);
        return {
          slides: newSlides,
          isDirty: true,
        };
      });

      createTldrawShape(editor, slideId, slideIndex, html, config.formatWidth, config.formatHeight);
    }
  },

  updateSlideVariant: (slideIndex, html, provider) => {
    const { editor } = get();
    set((state) => {
      const newSlides = new Map(state.slides);
      for (const [id, data] of newSlides.entries()) {
        if (data.slideIndex === slideIndex) {
          const existingIdx = data.variants.findIndex((v) => v.provider === provider);
          if (existingIdx >= 0) {
            const updatedVariants = [...data.variants];
            updatedVariants[existingIdx] = { ...updatedVariants[existingIdx], html };
            newSlides.set(id, { ...data, variants: updatedVariants });
            // If updating the active variant, sync to tldraw
            if (data.activeVariantId === updatedVariants[existingIdx].id) {
              updateTldrawShapeHtml(editor, id, html);
            }
          } else {
            const nextId = Math.max(0, ...data.variants.map((v) => v.id)) + 1;
            newSlides.set(id, {
              ...data,
              variants: [...data.variants, { id: nextId, provider, modelId: "", html, text: "" }],
              activeVariantId: nextId,
            });
            // New variant is now active, update tldraw
            updateTldrawShapeHtml(editor, id, html);
          }
          break;
        }
      }
      return { slides: newSlides, isDirty: true };
    });
  },

  setActiveVariant: (slideId, variantId) => {
    const { editor } = get();
    set((state) => {
      const newSlides = new Map(state.slides);
      const data = newSlides.get(slideId);
      if (data) {
        newSlides.set(slideId, { ...data, activeVariantId: variantId });
        // Sync the active variant's HTML to tldraw
        const variant = data.variants.find((v) => v.id === variantId);
        if (variant) {
          updateTldrawShapeHtml(editor, slideId, variant.html);
        }
      }
      return { slides: newSlides };
    });
  },

  removeSlide: (slideId) => {
    const { editor } = get();
    set((state) => {
      const newSlides = new Map(state.slides);
      newSlides.delete(slideId);
      return {
        slides: newSlides,
        isDirty: true,
      };
    });
    removeTldrawShape(editor, slideId);
  },

  updateSlideHtml: (slideId, variantId, newHtml) => {
    const { editor } = get();
    set((state) => {
      const newSlides = new Map(state.slides);
      const data = newSlides.get(slideId);
      if (data) {
        const updatedVariants = data.variants.map((v) =>
          v.id === variantId ? { ...v, html: newHtml } : v,
        );
        newSlides.set(slideId, { ...data, variants: updatedVariants });
        // If updating the active variant, sync to tldraw
        if (data.activeVariantId === variantId) {
          updateTldrawShapeHtml(editor, slideId, newHtml);
        }
      }
      return { slides: newSlides, isDirty: true };
    });
  },

  // Chat
  conversationId: null,
  messages: [],
  isStreaming: false,
  setConversationId: (id) => set({ conversationId: id }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateLastMessage: (patch) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return {};
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
      return { messages: msgs };
    }),
  setIsStreaming: (v) => set({ isStreaming: v }),

  // Edit
  editingNodeId: null,
  enterEditMode: (nodeId) => set({ editingNodeId: nodeId }),
  exitEditMode: () => set({ editingNodeId: null }),

  // Panel navigation
  activePanel: "chat",
  resetActivePanel: () => set({ activePanel: "chat" }),
  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),

  // Persistence
  draftPostId: null,
  isDirty: false,
  lastSavedAt: null,
  setDraftPostId: (id) => set({ draftPostId: id }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),

  // Derived
  slideCount: () => get().slides.size,
}));

// Selector helpers (stable references)
export const selectConfig = (s: CanvasStore) => s.config;
export const selectSlide = (slideId: string) => (s: CanvasStore) => s.slides.get(slideId);
export const selectMessages = (s: CanvasStore) => s.messages;
export const selectIsStreaming = (s: CanvasStore) => s.isStreaming;
export const selectActivePanel = (s: CanvasStore) => s.activePanel;

// Re-export NetworkId for convenience
export type { NetworkId };
