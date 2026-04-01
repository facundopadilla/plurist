/**
 * use-load-post.ts — Load an existing DraftPost onto the canvas.
 *
 * Reads postId from URL search params, fetches the post + variants,
 * and populates the canvas store with slide nodes.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCanvasStore } from "../canvas-store";
import { fetchContentItem } from "../../content/api";

export function useLoadPost() {
  const [searchParams] = useSearchParams();
  const postIdParam = searchParams.get("postId");
  const postId = postIdParam ? parseInt(postIdParam, 10) : null;

  const hydrateDraft = useCanvasStore((s) => s.hydrateDraft);
  const setDraftPostId = useCanvasStore((s) => s.setDraftPostId);
  const setConfig = useCanvasStore((s) => s.setConfig);
  const markSaved = useCanvasStore((s) => s.markSaved);
  const nodesCount = useCanvasStore((s) => s.slides.size);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedPostId, setLoadedPostId] = useState<number | null>(null);

  useEffect(() => {
    if (!postId || loadedPostId === postId || nodesCount > 0) return;

    let cancelled = false;

    async function load() {
      if (!postId) return;
      setIsLoading(true);
      setError(null);

      try {
        const post = await fetchContentItem(postId);

        if (cancelled) return;

        // Restore store state from post
        setDraftPostId(post.id);
        setConfig({
          title: post.title,
          formatKey: post.format ?? "ig_square",
          projectId: post.project_id,
          network: (post.target_networks?.[0] ?? null) as
            | import("../types").NetworkId
            | null,
        });

        hydrateDraft({
          frameMetadata: post.frame_metadata ?? [],
          variants: post.variants ?? [],
        });

        setLoadedPostId(postId);
        markSaved();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el contenido",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    postId,
    loadedPostId,
    nodesCount,
    hydrateDraft,
    setDraftPostId,
    setConfig,
    markSaved,
  ]);

  return { isLoading, error, postId };
}
