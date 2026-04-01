/**
 * use-save-draft.ts — Auto-save canvas state to backend (DraftPost + DraftVariants).
 *
 * Debounced 2s after last edit. Creates DraftPost on first save,
 * updates on subsequent saves. Registers beforeunload guard when dirty.
 */
import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "../canvas-store";
import { createContent, updateContent } from "../../content/api";

const DEBOUNCE_MS = 2000;

export function useSaveDraft() {
  const isDirty = useCanvasStore((s) => s.isDirty);
  const draftPostId = useCanvasStore((s) => s.draftPostId);
  const slides = useCanvasStore((s) => s.slides);
  const config = useCanvasStore((s) => s.config);
  const setDraftPostId = useCanvasStore((s) => s.setDraftPostId);
  const markSaved = useCanvasStore((s) => s.markSaved);
  const hydrateDraft = useCanvasStore((s) => s.hydrateDraft);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      // Collect slide data
      const slideEntries = Array.from(slides.entries()).sort(
        ([, a], [, b]) => a.slideIndex - b.slideIndex,
      );

      // Get html_content from slide 0 for backward compat
      const slide0 = slideEntries.find(([, d]) => d.slideIndex === 0);
      const slide0Variant = slide0?.[1].variants.find(
        (v) => v.id === slide0[1].activeVariantId,
      );
      const htmlContent = slide0Variant?.html ?? "";
      const frameMetadata = slideEntries.map(([, slideData]) => ({
        slide_index: slideData.slideIndex,
        name: slideData.name ?? `Frame ${slideData.slideIndex + 1}`,
        is_favorite: slideData.isFavorite ?? false,
        annotations: slideData.annotations ?? [],
      }));
      const variantsPayload = slideEntries.flatMap(([, slideData]) =>
        slideData.variants.map((variant) => ({
          local_id: variant.id,
          slide_index: slideData.slideIndex,
          provider: variant.provider,
          model_id: variant.modelId,
          generated_html: variant.html,
          generated_text: variant.text,
          variant_type: variant.variantType ?? "default",
          derived_from_local_id: variant.derivedFromVariantId ?? null,
          generation_meta: {
            ...(variant.generationMeta ?? {}),
            variantName: variant.name ?? variant.generationMeta?.variantName,
          },
        })),
      );

      let postId = draftPostId;

      if (!postId) {
        // Create new DraftPost
        const post = await createContent({
          title: config.title || "Canvas Studio Draft",
          target_networks: config.network ? [config.network] : [],
          project_id: config.projectId,
          format: config.formatKey,
          html_content: htmlContent,
        });
        postId = post.id;
        setDraftPostId(postId);
      } else {
        // Update existing DraftPost
        const post = await updateContent(postId, {
          title: config.title || "Canvas Studio Draft",
          target_networks: config.network ? [config.network] : [],
          project_id: config.projectId,
          format: config.formatKey,
          html_content: htmlContent,
          frame_metadata: frameMetadata,
          variants: variantsPayload,
        });
        hydrateDraft({
          frameMetadata: post.frame_metadata ?? [],
          variants: post.variants ?? [],
        });
      }

      if (!draftPostId && postId) {
        const syncedPost = await updateContent(postId, {
          frame_metadata: frameMetadata,
          variants: variantsPayload,
        });
        hydrateDraft({
          frameMetadata: syncedPost.frame_metadata ?? [],
          variants: syncedPost.variants ?? [],
        });
      }

      markSaved();
    } catch (err) {
      console.error("[useSaveDraft] save failed:", err);
    } finally {
      isSavingRef.current = false;
    }
  }, [slides, config, draftPostId, setDraftPostId, markSaved, hydrateDraft]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, save]);

  // beforeunload guard
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return { save };
}
