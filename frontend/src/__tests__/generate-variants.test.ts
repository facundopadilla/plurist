import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCanvasStore } from "../features/canvas/canvas-store";
import type { VariantGenerationMeta } from "../features/canvas/types";

/**
 * Create a mock tldraw Editor with spied methods.
 */
function makeMockEditor() {
  const shapes = new Map<string, Record<string, unknown>>();

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
    select: vi.fn(),
    getSelectedShapes: vi.fn(() => []),
    getShape: vi.fn((id: string) => shapes.get(id) ?? null),
    _shapes: shapes,
  };
}

describe("generate-variants feature", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
  });

  describe("contextual AI target with generate-variants mode", () => {
    it("opens contextual AI with generate-variants mode", () => {
      useCanvasStore
        .getState()
        .openContextualAi("slide-abc", "generate-variants");

      expect(useCanvasStore.getState().contextualAiTarget).toEqual({
        slideId: "slide-abc",
        mode: "generate-variants",
      });
    });

    it("closes generate-variants mode cleanly", () => {
      useCanvasStore
        .getState()
        .openContextualAi("slide-abc", "generate-variants");
      useCanvasStore.getState().closeContextualAi();

      expect(useCanvasStore.getState().contextualAiTarget).toBeNull();
    });

    it("can switch from generate-variants to another mode", () => {
      useCanvasStore
        .getState()
        .openContextualAi("slide-abc", "generate-variants");
      useCanvasStore.getState().openContextualAi("slide-abc", "regenerate");

      expect(useCanvasStore.getState().contextualAiTarget).toEqual({
        slideId: "slide-abc",
        mode: "regenerate",
      });
    });
  });

  describe("addGeneratedVariantToSlide with variant generation metadata", () => {
    it("stores creativeRange and aspects in generation metadata", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      const meta: VariantGenerationMeta = {
        sourcePrompt: "make it premium",
        sourceVariantId: 1,
        mode: "generate-variants",
        provider: "anthropic",
        modelId: "claude-3-5-sonnet",
        variantType: "default",
        derivedFromVariantId: 1,
        variantName: "anthropic variant",
        creativeRange: "explore",
        aspects: ["color", "layout"],
      };

      const variantId = useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>Variant</p>",
          "anthropic",
          "claude-3-5-sonnet",
          meta,
        );

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(variantId).toBe(2);
      expect(slide.activeVariantId).toBe(2);

      const generatedVariant = slide.variants.find((v) => v.id === 2)!;
      expect(generatedVariant.generationMeta?.creativeRange).toBe("explore");
      expect(generatedVariant.generationMeta?.aspects).toEqual([
        "color",
        "layout",
      ]);
      expect(generatedVariant.generationMeta?.mode).toBe("generate-variants");
      expect(generatedVariant.provider).toBe("anthropic");
      expect(generatedVariant.html).toBe("<p>Variant</p>");
    });

    it("supports multiple variants from different providers on the same slide", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      const providers = ["openai", "anthropic", "gemini"];
      const variantIds: number[] = [];

      for (const provider of providers) {
        const meta: VariantGenerationMeta = {
          sourcePrompt: "darker theme",
          sourceVariantId: 1,
          mode: "generate-variants",
          provider,
          modelId: `${provider}-model`,
          variantType: "default",
          derivedFromVariantId: 1,
          variantName: `${provider} variant`,
          creativeRange: "reimagine",
          aspects: ["typography"],
        };

        const vid = useCanvasStore
          .getState()
          .addGeneratedVariantToSlide(
            slideId,
            `<p>Variant from ${provider}</p>`,
            provider,
            `${provider}-model`,
            meta,
          );
        if (vid !== null) variantIds.push(vid);
      }

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      // 1 original + 3 generated
      expect(slide.variants).toHaveLength(4);
      expect(variantIds).toEqual([2, 3, 4]);

      // Last inserted variant is active
      expect(slide.activeVariantId).toBe(4);

      // Each variant has the correct provider
      expect(slide.variants[1].provider).toBe("openai");
      expect(slide.variants[2].provider).toBe("anthropic");
      expect(slide.variants[3].provider).toBe("gemini");

      // All share the same creativeRange
      for (let i = 1; i <= 3; i++) {
        expect(slide.variants[i].generationMeta?.creativeRange).toBe(
          "reimagine",
        );
        expect(slide.variants[i].derivedFromVariantId).toBe(1);
      }
    });

    it("marks the store as dirty after adding multi-provider variants", () => {
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);
      useCanvasStore.setState({ isDirty: false });

      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(slideId, "<p>V</p>", "anthropic", "c3", {
          mode: "generate-variants",
          creativeRange: "refine",
          aspects: [],
        });

      expect(useCanvasStore.getState().isDirty).toBe(true);
    });

    it("updates the tldraw shape HTML when a variant is added", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      mockEditor.updateShape.mockClear();

      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>New variant</p>",
          "gemini",
          "gemini-pro",
          {
            mode: "generate-variants",
            creativeRange: "explore",
          },
        );

      expect(mockEditor.updateShape).toHaveBeenCalledWith(
        expect.objectContaining({
          props: { html: "<p>New variant</p>" },
        }),
      );
    });
  });

  describe("variant navigation after multi-provider generation", () => {
    it("can switch between generated variants using setActiveVariant", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      // Add 3 variants (simulating multi-provider generation)
      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(slideId, "<p>V-OAI</p>", "openai", "gpt", {
          mode: "generate-variants",
          variantName: "openai variant",
        });
      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>V-ANT</p>",
          "anthropic",
          "claude",
          {
            mode: "generate-variants",
            variantName: "anthropic variant",
          },
        );

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(slide.variants).toHaveLength(3);

      // Switch to first generated variant
      mockEditor.updateShape.mockClear();
      useCanvasStore.getState().setActiveVariant(slideId, 2);

      expect(
        useCanvasStore.getState().slides.get(slideId)!.activeVariantId,
      ).toBe(2);
      expect(mockEditor.updateShape).toHaveBeenCalledWith(
        expect.objectContaining({
          props: { html: "<p>V-OAI</p>" },
        }),
      );
    });

    it("can remove a generated variant and fall back cleanly", () => {
      const mockEditor = makeMockEditor();
      useCanvasStore.getState().setEditor(mockEditor as never);
      const slideId = useCanvasStore
        .getState()
        .addSlide(0, "<p>Base</p>", "openai", 1);

      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(slideId, "<p>V1</p>", "openai", "gpt", {
          mode: "generate-variants",
        });
      useCanvasStore
        .getState()
        .addGeneratedVariantToSlide(
          slideId,
          "<p>V2</p>",
          "anthropic",
          "claude",
          {
            mode: "generate-variants",
          },
        );

      // Active is variant 3 (last added). Remove it.
      useCanvasStore.getState().removeVariant(slideId, 3);

      const slide = useCanvasStore.getState().slides.get(slideId)!;
      expect(slide.variants).toHaveLength(2);
      // Falls back to variant 2 (the last remaining)
      expect(slide.activeVariantId).toBe(2);
    });
  });

  describe("config.selectedProviders drives variant count", () => {
    it("has default providers configured", () => {
      const config = useCanvasStore.getState().config;
      expect(config.selectedProviders).toEqual([
        "openai",
        "anthropic",
        "gemini",
      ]);
    });

    it("can update selectedProviders to control variant generation scope", () => {
      useCanvasStore.getState().setConfig({
        selectedProviders: ["openai", "anthropic"],
      });

      expect(useCanvasStore.getState().config.selectedProviders).toEqual([
        "openai",
        "anthropic",
      ]);
    });
  });
});
