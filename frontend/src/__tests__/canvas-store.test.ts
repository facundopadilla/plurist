import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCanvasStore } from "../features/canvas/canvas-store";

/** Shape partial as passed to editor.createShape / updateShape */
interface MockShapePartial {
  id?: string;
  type?: string;
  x?: number;
  y?: number;
  props?: Record<string, unknown>;
}

/**
 * Create a mock tldraw Editor with spied methods.
 * Only the methods actually called by canvas-store are mocked.
 */
function makeMockEditor() {
  const shapes = new Map<string, Record<string, unknown>>();
  let selectedShapeIds: string[] = [];

  return {
    createShape: vi.fn((partial: Record<string, unknown>) => {
      shapes.set(partial.id as string, partial);
    }),
    deleteShape: vi.fn((id: string) => {
      shapes.delete(id);
    }),
    deleteShapes: vi.fn((ids: string[]) => {
      ids.forEach((id) => shapes.delete(id));
    }),
    updateShape: vi.fn((partial: Record<string, unknown>) => {
      const existing = shapes.get(partial.id as string);
      if (existing) {
        shapes.set(partial.id as string, { ...existing, ...partial });
      }
    }),
    select: vi.fn((...ids: string[]) => {
      selectedShapeIds = ids;
    }),
    getSelectedShapes: vi.fn(() =>
      selectedShapeIds
        .map((id) => shapes.get(id))
        .filter((shape): shape is Record<string, unknown> => Boolean(shape)),
    ),
    getShape: vi.fn((id: string) => shapes.get(id) ?? null),
    /** Test helper: inspect internal shape map */
    _shapes: shapes,
  };
}

describe("canvas-store", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
  });

  describe("initial state", () => {
    it("starts with empty slides map", () => {
      expect(useCanvasStore.getState().slides.size).toBe(0);
    });

    it("starts with null editor", () => {
      expect(useCanvasStore.getState().editor).toBeNull();
    });

    it("slideCount returns 0 when no slides", () => {
      expect(useCanvasStore.getState().slideCount()).toBe(0);
    });

    it("starts with isDirty false", () => {
      expect(useCanvasStore.getState().isDirty).toBe(false);
    });

    it("starts with no selected slides", () => {
      expect(useCanvasStore.getState().selectedSlideIds).toEqual([]);
    });
  });

  describe("selectedSlideIds", () => {
    it("stores and clears selected slide ids", () => {
      const firstSlideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>1</p>", "openai", 1);
      const secondSlideId = useCanvasStore
        .getState()
        .addSlide(1, "<p>2</p>", "openai", 1);

      useCanvasStore
        .getState()
        .setSelectedSlideIds([firstSlideId, secondSlideId]);

      expect(useCanvasStore.getState().selectedSlideIds).toEqual([
        firstSlideId,
        secondSlideId,
      ]);

      useCanvasStore.getState().clearSelectedSlideIds();
      expect(useCanvasStore.getState().selectedSlideIds).toEqual([]);
    });

    it("removes deleted slides from selected slide ids", () => {
      const firstSlideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>1</p>", "openai", 1);
      const secondSlideId = useCanvasStore
        .getState()
        .addSlide(1, "<p>2</p>", "openai", 1);

      useCanvasStore
        .getState()
        .setSelectedSlideIds([firstSlideId, secondSlideId]);
      useCanvasStore.getState().removeSlide(firstSlideId);

      expect(useCanvasStore.getState().selectedSlideIds).toEqual([
        secondSlideId,
      ]);
    });
  });

  describe("setEditor", () => {
    it("stores the editor reference", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      expect(useCanvasStore.getState().editor).toBe(mockEditor);
    });

    it("can set editor to null", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      useCanvasStore.getState().setEditor(null);
      expect(useCanvasStore.getState().editor).toBeNull();
    });
  });

  describe("addSlide", () => {
    it("adds a slide to the slides map and marks dirty", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Hello</p>", "openai", 1);

      const state = useCanvasStore.getState();
      expect(state.slides.size).toBe(1);
      expect(state.slides.has(slideId)).toBe(true);
      expect(state.isDirty).toBe(true);
    });

    it("creates the slide with correct data", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Test</p>", "anthropic", 5, "claude-3");

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(slide.slideIndex).toBe(0);
      expect(slide.activeVariantId).toBe(5);
      expect(slide.name).toBe("Frame 1");
      expect(slide.isFavorite).toBe(false);
      expect(slide.annotations).toEqual([]);
      expect(slide.variants).toHaveLength(1);
      expect(slide.variants[0]).toEqual({
        id: 5,
        provider: "anthropic",
        modelId: "claude-3",
        html: "<p>Test</p>",
        text: "",
        variantType: "default",
        derivedFromVariantId: null,
      });
    });

    it("returns a unique slide ID each time", () => {
      const id1 = useCanvasStore
        .getState()
        .addSlide(0, "<p>1</p>", "openai", 1);
      const id2 = useCanvasStore
        .getState()
        .addSlide(1, "<p>2</p>", "openai", 1);
      expect(id1).not.toBe(id2);
    });

    it("calls editor.createShape when editor is set", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      useCanvasStore.getState().addSlide(0, "<p>Hello</p>", "openai", 1);

      expect(mockEditor.createShape).toHaveBeenCalledTimes(1);
      const callArg = mockEditor.createShape.mock
        .calls[0][0] as MockShapePartial;
      expect(callArg.type).toBe("html-shape");
      expect(callArg.props!.html).toBe("<p>Hello</p>");
      expect(callArg.props!.w).toBe(400);
      expect(callArg.x).toBe(0); // slideIndex 0 * (400 + 48) = 0
    });

    it("does not throw when editor is null", () => {
      expect(() => {
        useCanvasStore.getState().addSlide(0, "<p>No editor</p>", "openai", 1);
      }).not.toThrow();
    });

    it("positions shapes based on slideIndex", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      useCanvasStore.getState().addSlide(0, "<p>0</p>", "openai", 1);
      useCanvasStore.getState().addSlide(1, "<p>1</p>", "openai", 1);
      useCanvasStore.getState().addSlide(2, "<p>2</p>", "openai", 1);

      // slideIndex * (400 + 48)
      expect(
        (mockEditor.createShape.mock.calls[0][0] as MockShapePartial).x,
      ).toBe(0);
      expect(
        (mockEditor.createShape.mock.calls[1][0] as MockShapePartial).x,
      ).toBe(448);
      expect(
        (mockEditor.createShape.mock.calls[2][0] as MockShapePartial).x,
      ).toBe(896);
    });
  });

  describe("removeSlide", () => {
    it("removes a slide from the map", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Del</p>", "openai", 1);
      useCanvasStore.getState().removeSlide(slideId);

      expect(useCanvasStore.getState().slides.size).toBe(0);
    });

    it("calls editor.deleteShape when editor is set", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Del</p>", "openai", 1);
      useCanvasStore.getState().removeSlide(slideId);

      expect(mockEditor.deleteShape).toHaveBeenCalledTimes(1);
    });

    it("does not throw when removing a nonexistent slide", () => {
      expect(() => {
        useCanvasStore.getState().removeSlide("nonexistent-id");
      }).not.toThrow();
    });

    it("keeps edit mode clean when deleting through actions later", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Del</p>", "openai", 1);
      useCanvasStore.getState().enterEditMode(`shape:${slideId}`);
      useCanvasStore.getState().removeSlide(slideId);

      expect(useCanvasStore.getState().slides.size).toBe(0);
    });
  });

  describe("duplicateSlide", () => {
    it("duplicates slide content and creates a second shape", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      const sourceSlideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Hello clone</p>", "openai", 1);

      const duplicatedSlideId = useCanvasStore
        .getState()
        .duplicateSlide(sourceSlideId);

      expect(duplicatedSlideId).not.toBeNull();
      expect(duplicatedSlideId).not.toBe(sourceSlideId);
      expect(useCanvasStore.getState().slides.size).toBe(2);

      const duplicatedSlide = useCanvasStore
        .getState()
        .slides.get(duplicatedSlideId!)!;
      expect(duplicatedSlide.name).toContain("copy");
      expect(duplicatedSlide.isFavorite).toBe(false);
      expect(duplicatedSlide.variants).toEqual([
        {
          id: 1,
          provider: "openai",
          modelId: "",
          html: "<p>Hello clone</p>",
          text: "",
          variantType: "default",
          derivedFromVariantId: null,
        },
      ]);
      expect(mockEditor.createShape).toHaveBeenCalledTimes(2);
    });

    it("offsets the duplicated shape from the original", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      const sourceSlideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Hello</p>", "openai", 1);
      useCanvasStore.getState().duplicateSlide(sourceSlideId);

      const originalCall = mockEditor.createShape.mock
        .calls[0][0] as MockShapePartial;
      const duplicateCall = mockEditor.createShape.mock
        .calls[1][0] as MockShapePartial;

      expect(duplicateCall.x).toBe((originalCall.x as number) + 64);
      expect(duplicateCall.y).toBe((originalCall.y as number) + 64);
    });

    it("returns null when the source slide does not exist", () => {
      expect(
        useCanvasStore.getState().duplicateSlide("missing-slide"),
      ).toBeNull();
    });
  });

  describe("frame metadata", () => {
    it("renameSlide updates the local frame name", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Name</p>", "openai", 1);

      useCanvasStore.getState().renameSlide(slideId, "Hero desktop");

      expect(useCanvasStore.getState().slides.get(slideId)?.name).toBe(
        "Hero desktop",
      );
    });

    it("toggleSlideFavorite toggles local favorite state", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Fav</p>", "openai", 1);

      useCanvasStore.getState().toggleSlideFavorite(slideId);
      expect(useCanvasStore.getState().slides.get(slideId)?.isFavorite).toBe(
        true,
      );

      useCanvasStore.getState().toggleSlideFavorite(slideId);
      expect(useCanvasStore.getState().slides.get(slideId)?.isFavorite).toBe(
        false,
      );
    });
  });

  describe("annotations", () => {
    it("addSlideAnnotation appends a local annotation and marks dirty", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Annotate</p>", "openai", 1);
      useCanvasStore.setState({ isDirty: false });

      const annotationId = useCanvasStore
        .getState()
        .addSlideAnnotation(slideId, "Primera nota");

      expect(annotationId).toBeTruthy();
      expect(
        useCanvasStore.getState().slides.get(slideId)?.annotations,
      ).toEqual([
        expect.objectContaining({ id: annotationId, text: "Primera nota" }),
      ]);
      expect(useCanvasStore.getState().isDirty).toBe(true);
    });

    it("updateSlideAnnotation updates annotation text", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Annotate</p>", "openai", 1);
      const annotationId = useCanvasStore
        .getState()
        .addSlideAnnotation(slideId, "Old note")!;

      useCanvasStore
        .getState()
        .updateSlideAnnotation(slideId, annotationId, "New note");

      expect(
        useCanvasStore.getState().slides.get(slideId)?.annotations,
      ).toEqual([
        expect.objectContaining({ id: annotationId, text: "New note" }),
      ]);
    });

    it("removeSlideAnnotation removes the selected annotation", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Annotate</p>", "openai", 1);
      const annotationId = useCanvasStore
        .getState()
        .addSlideAnnotation(slideId, "Delete")!;

      useCanvasStore.getState().removeSlideAnnotation(slideId, annotationId);

      expect(
        useCanvasStore.getState().slides.get(slideId)?.annotations,
      ).toEqual([]);
    });
  });

  describe("contextual AI", () => {
    it("addGeneratedVariantToSlide appends and activates a generated variant", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      const variantId = useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>Variant</p>",
          "anthropic",
          "claude-3-5-sonnet",
          {
            sourcePrompt: "more premium",
            sourceVariantId: 1,
            mode: "generate",
          },
        );

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(variantId).toBe(2);
      expect(slide.activeVariantId).toBe(2);
      expect(slide.generationMeta).toEqual(
        expect.objectContaining({
          sourcePrompt: "more premium",
          sourceVariantId: 1,
        }),
      );
      expect(slide.variants[1]).toEqual(
        expect.objectContaining({
          id: 2,
          provider: "anthropic",
          modelId: "claude-3-5-sonnet",
          html: "<p>Variant</p>",
        }),
      );
      expect(mockEditor.updateShape).toHaveBeenCalledWith(
        expect.objectContaining({ props: { html: "<p>Variant</p>" } }),
      );
    });

    it("stores responsive variant metadata and can find variants by breakpoint", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      const variantId = useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>Mobile Variant</p>",
          "openai",
          "gpt-4o",
          {
            sourcePrompt: "adaptar a mobile",
            sourceVariantId: 1,
            derivedFromVariantId: 1,
            variantType: "mobile",
            mode: "mobile",
          },
        );

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(variantId).toBe(2);
      expect(slide.variants[1]).toEqual(
        expect.objectContaining({
          id: 2,
          variantType: "mobile",
          derivedFromVariantId: 1,
        }),
      );
      expect(
        useCanvasStore
          .getState()
          .getResponsiveVariantForSlide(slideId, "mobile"),
      ).toBe(2);
      expect(
        useCanvasStore
          .getState()
          .getResponsiveVariantForSlide(slideId, "tablet"),
      ).toBeNull();
    });

    it("replaces an existing responsive variant instead of creating duplicates", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);
      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>Mobile A</p>",
          "openai",
          "gpt-4o",
          {
            variantType: "mobile",
            derivedFromVariantId: 1,
            sourceVariantId: 1,
            mode: "mobile",
          },
        );

      const replacedId = useCanvasStore
        .getState()
        .replaceResponsiveVariant(
          slideId,
          "mobile",
          "<p>Mobile B</p>",
          "anthropic",
          "claude",
          {
            variantType: "mobile",
            derivedFromVariantId: 1,
            sourceVariantId: 1,
            mode: "mobile",
          },
        );

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(replacedId).toBe(2);
      expect(slide.variants).toHaveLength(2);
      expect(slide.variants[1]).toEqual(
        expect.objectContaining({
          id: 2,
          html: "<p>Mobile B</p>",
          provider: "anthropic",
        }),
      );
    });
  });

  describe("variant management", () => {
    it("renameVariant stores a custom variant name", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);
      useCanvasStore.getState().renameVariant(slideId, 1, "Hero principal");
      expect(
        useCanvasStore.getState().slides.get(slideId)?.variants[0].name,
      ).toBe("Hero principal");
    });

    it("duplicateVariant creates a new active variant derived from the source", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);
      useCanvasStore.getState().renameVariant(slideId, 1, "Original");
      const duplicateId = useCanvasStore
        .getState()
        .duplicateVariant(slideId, 1);
      const slide = useCanvasStore.getState().slides.get(slideId)!;

      expect(duplicateId).toBe(2);
      expect(slide.activeVariantId).toBe(2);
      expect(slide.variants[1]).toEqual(
        expect.objectContaining({
          id: 2,
          name: "Original copy",
          derivedFromVariantId: 1,
        }),
      );
    });

    it("removeVariant picks a safe fallback active variant", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);
      useCanvasStore.getState().duplicateVariant(slideId, 1);

      useCanvasStore.getState().removeVariant(slideId, 2);

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(slide.variants).toHaveLength(1);
      expect(slide.activeVariantId).toBe(1);
    });
  });

  describe("hydrateDraft", () => {
    it("hydrates frame metadata and variant metadata from persisted draft data", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      useCanvasStore.getState().hydrateDraft({
        frameMetadata: [
          {
            slide_index: 0,
            name: "Hero principal",
            is_favorite: true,
            annotations: [
              {
                id: "annotation-1",
                text: "Revisar CTA",
                createdAt: "2026-04-01T00:00:00Z",
              },
            ],
          },
        ],
        variants: [
          {
            id: 101,
            provider: "openai",
            model_id: "gpt-4o",
            generated_text: "",
            generated_html: "<p>Default</p>",
            slide_index: 0,
            variant_type: "default",
            derived_from_variant_id: null,
            generation_meta: {},
            created_at: "2026-04-01T00:00:00Z",
          },
          {
            id: 102,
            provider: "openai",
            model_id: "gpt-4o",
            generated_text: "",
            generated_html: "<p>Mobile</p>",
            slide_index: 0,
            variant_type: "mobile",
            derived_from_variant_id: 101,
            generation_meta: {
              variantType: "mobile",
              derivedFromVariantId: 101,
            },
            created_at: "2026-04-01T00:01:00Z",
          },
        ],
      });

      const hydratedSlide = Array.from(
        useCanvasStore.getState().slides.values(),
      )[0];
      expect(hydratedSlide.name).toBe("Hero principal");
      expect(hydratedSlide.isFavorite).toBe(true);
      expect(hydratedSlide.annotations).toEqual([
        expect.objectContaining({ text: "Revisar CTA" }),
      ]);
      expect(hydratedSlide.activeVariantId).toBe(102);
      expect(hydratedSlide.variants[1]).toEqual(
        expect.objectContaining({
          variantType: "mobile",
          derivedFromVariantId: 101,
        }),
      );
    });

    it("falls back safely when drafts have no metadata", () => {
      useCanvasStore.getState().hydrateDraft({
        frameMetadata: [],
        variants: [
          {
            id: 201,
            provider: "anthropic",
            model_id: "claude",
            generated_text: "",
            generated_html: "<p>Legacy</p>",
            slide_index: 0,
            created_at: "2026-04-01T00:00:00Z",
          },
        ],
      });

      const hydratedSlide = Array.from(
        useCanvasStore.getState().slides.values(),
      )[0];
      expect(hydratedSlide.name).toBe("Frame 1");
      expect(hydratedSlide.isFavorite).toBe(false);
      expect(hydratedSlide.annotations).toEqual([]);
      expect(hydratedSlide.variants[0].variantType).toBe("default");
    });

    it("preserves UI state when the same slide still exists after hydrate", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Current</p>", "openai", 1);
      const shapeId = `shape:${slideId}`;
      useCanvasStore.getState().enterEditMode(shapeId);
      useCanvasStore.getState().openAnnotationEditor(slideId);
      useCanvasStore.getState().openContextualAi(slideId, "generate");
      mockEditor.select(shapeId);

      useCanvasStore.getState().hydrateDraft({
        frameMetadata: [
          {
            slide_index: 0,
            name: "Current",
            is_favorite: false,
            annotations: [],
          },
        ],
        variants: [
          {
            id: 1,
            provider: "openai",
            model_id: "gpt-4o",
            generated_text: "",
            generated_html: "<p>Current</p>",
            slide_index: 0,
            created_at: "2026-04-01T00:00:00Z",
          },
        ],
      });

      expect(useCanvasStore.getState().editingNodeId).toBe(shapeId);
      expect(useCanvasStore.getState().annotationEditorSlideId).toBe(slideId);
      expect(useCanvasStore.getState().contextualAiTarget).toEqual({
        slideId,
        mode: "generate",
      });
      expect(mockEditor.select).toHaveBeenCalledWith(shapeId);
    });

    it("cleans UI state when the referenced slide disappears after hydrate", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Current</p>", "openai", 1);
      const shapeId = `shape:${slideId}`;
      useCanvasStore.getState().enterEditMode(shapeId);
      useCanvasStore.getState().openAnnotationEditor(slideId);
      useCanvasStore.getState().openContextualAi(slideId, "generate");

      useCanvasStore.getState().hydrateDraft({
        frameMetadata: [
          {
            slide_index: 1,
            name: "Other",
            is_favorite: false,
            annotations: [],
          },
        ],
        variants: [
          {
            id: 2,
            provider: "openai",
            model_id: "gpt-4o",
            generated_text: "",
            generated_html: "<p>Other</p>",
            slide_index: 1,
            created_at: "2026-04-01T00:00:00Z",
          },
        ],
      });

      expect(useCanvasStore.getState().editingNodeId).toBeNull();
      expect(useCanvasStore.getState().annotationEditorSlideId).toBeNull();
      expect(useCanvasStore.getState().contextualAiTarget).toBeNull();
    });
  });

  describe("updateSlideHtml", () => {
    it("updates the html of a specific variant", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Old</p>", "openai", 1);
      useCanvasStore.getState().updateSlideHtml(slideId, 1, "<p>New</p>");

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(slide.variants[0].html).toBe("<p>New</p>");
    });

    it("calls editor.updateShape when updating the active variant", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Old</p>", "openai", 1);
      useCanvasStore.getState().updateSlideHtml(slideId, 1, "<p>Updated</p>");

      expect(mockEditor.updateShape).toHaveBeenCalledTimes(1);
      expect(
        (mockEditor.updateShape.mock.calls[0][0] as MockShapePartial).props!
          .html,
      ).toBe("<p>Updated</p>");
    });

    it("does NOT call editor.updateShape when updating a non-active variant", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>V1</p>", "openai", 1);

      // Add a second variant by updating the store directly
      useCanvasStore.setState((state) => {
        const newSlides = new Map(state.slides);
        const data = newSlides.get(slideId)!;
        newSlides.set(slideId, {
          ...data,
          variants: [
            ...data.variants,
            {
              id: 2,
              provider: "anthropic",
              modelId: "",
              html: "<p>V2</p>",
              text: "",
            },
          ],
          // activeVariantId stays 1
        });
        return { slides: newSlides };
      });

      mockEditor.updateShape.mockClear();
      // Update variant 2 (not active)
      useCanvasStore
        .getState()
        .updateSlideHtml(slideId, 2, "<p>V2 updated</p>");

      expect(mockEditor.updateShape).not.toHaveBeenCalled();
    });

    it("marks dirty after update", () => {
      useCanvasStore.setState({ isDirty: false });
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>X</p>", "openai", 1);
      useCanvasStore.setState({ isDirty: false }); // reset after addSlide sets it
      useCanvasStore.getState().updateSlideHtml(slideId, 1, "<p>Y</p>");
      expect(useCanvasStore.getState().isDirty).toBe(true);
    });
  });

  describe("setActiveVariant", () => {
    it("changes the active variant ID", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>V1</p>", "openai", 1);

      // Add a second variant
      useCanvasStore.setState((state) => {
        const newSlides = new Map(state.slides);
        const data = newSlides.get(slideId)!;
        newSlides.set(slideId, {
          ...data,
          variants: [
            ...data.variants,
            {
              id: 2,
              provider: "anthropic",
              modelId: "",
              html: "<p>V2</p>",
              text: "",
            },
          ],
        });
        return { slides: newSlides };
      });

      useCanvasStore.getState().setActiveVariant(slideId, 2);
      expect(
        useCanvasStore.getState().slides.get(slideId)!.activeVariantId,
      ).toBe(2);
    });

    it("syncs the new active variant HTML to tldraw", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);

      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>V1</p>", "openai", 1);

      useCanvasStore.setState((state) => {
        const newSlides = new Map(state.slides);
        const data = newSlides.get(slideId)!;
        newSlides.set(slideId, {
          ...data,
          variants: [
            ...data.variants,
            {
              id: 2,
              provider: "anthropic",
              modelId: "",
              html: "<p>V2</p>",
              text: "",
            },
          ],
        });
        return { slides: newSlides };
      });

      mockEditor.updateShape.mockClear();
      useCanvasStore.getState().setActiveVariant(slideId, 2);

      expect(mockEditor.updateShape).toHaveBeenCalledTimes(1);
      expect(
        (mockEditor.updateShape.mock.calls[0][0] as MockShapePartial).props!
          .html,
      ).toBe("<p>V2</p>");
    });
  });

  describe("addSlideFromChat", () => {
    it("creates a new slide when no slide exists for the index", () => {
      useCanvasStore.getState().addSlideFromChat(0, "<p>Chat</p>", "openai");

      expect(useCanvasStore.getState().slides.size).toBe(1);
    });

    it("adds a variant when a slide already exists for the index", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>First</p>", "openai", 1);
      useCanvasStore
        .getState()
        .addSlideFromChat(0, "<p>Second</p>", "anthropic");

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(slide.variants).toHaveLength(2);
      expect(slide.variants[1].provider).toBe("anthropic");
      expect(slide.variants[1].html).toBe("<p>Second</p>");
      // New variant should be the active one
      expect(slide.activeVariantId).toBe(slide.variants[1].id);
    });
  });

  describe("edit mode", () => {
    it("enterEditMode sets editingNodeId", () => {
      useCanvasStore.getState().enterEditMode("shape:test-123");
      expect(useCanvasStore.getState().editingNodeId).toBe("shape:test-123");
    });

    it("exitEditMode clears editingNodeId", () => {
      useCanvasStore.getState().enterEditMode("shape:test-123");
      useCanvasStore.getState().exitEditMode();
      expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it("opens and closes annotation editor", () => {
      useCanvasStore.getState().openAnnotationEditor("slide-abc");
      expect(useCanvasStore.getState().annotationEditorSlideId).toBe(
        "slide-abc",
      );

      useCanvasStore.getState().closeAnnotationEditor();
      expect(useCanvasStore.getState().annotationEditorSlideId).toBeNull();
    });

    it("opens and closes contextual AI editor", () => {
      useCanvasStore.getState().openContextualAi("slide-abc", "generate");
      expect(useCanvasStore.getState().contextualAiTarget).toEqual({
        slideId: "slide-abc",
        mode: "generate",
      });

      useCanvasStore.getState().closeContextualAi();
      expect(useCanvasStore.getState().contextualAiTarget).toBeNull();
    });
  });

  describe("persistence helpers", () => {
    it("markDirty sets isDirty to true", () => {
      useCanvasStore.setState({ isDirty: false });
      useCanvasStore.getState().markDirty();
      expect(useCanvasStore.getState().isDirty).toBe(true);
    });

    it("markSaved sets isDirty to false and updates lastSavedAt", () => {
      useCanvasStore.setState({ isDirty: true, lastSavedAt: null });
      useCanvasStore.getState().markSaved();

      const state = useCanvasStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBeInstanceOf(Date);
    });
  });

  describe("slideCount", () => {
    it("reflects the number of slides", () => {
      useCanvasStore.getState().addSlide(0, "<p>1</p>", "openai", 1);
      useCanvasStore.getState().addSlide(1, "<p>2</p>", "openai", 1);

      expect(useCanvasStore.getState().slideCount()).toBe(2);
    });
  });
});
