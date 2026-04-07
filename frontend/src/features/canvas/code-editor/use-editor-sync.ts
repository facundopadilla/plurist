import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useCanvasStore } from "../canvas-store";
import type { VirtualFile } from "../types";

const DEBOUNCE_MS = 300;

interface EditorSyncState {
  activeFileId: string;
  files: VirtualFile[];
  activeFile: VirtualFile | null;
  updateEpoch: number;
  handleFileSelect: (fileId: string) => void;
  handleEditorChange: (value: string) => void;
}

/**
 * Hook that orchestrates bidirectional sync between the Monaco editor and the canvas store.
 *
 * - Code → Canvas: debounced onChange (300ms) calls updateSlideHtml or setGlobalStyles
 * - Canvas → Code: store changes propagate via getVirtualFileTree (epoch guard in MonacoWrapper)
 * - Selection sync: when a slide is selected on canvas (editingNodeId changes), switches file
 * - AI lock: readOnly flag from getVirtualFileTree propagates to MonacoWrapper
 */
export function useEditorSync(): EditorSyncState {
  const [activeFileId, setActiveFileId] = useState<string>("styles.css");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store selectors — subscribe to primitives, derive file tree in useMemo
  // to avoid infinite re-render from getVirtualFileTree() creating new arrays.
  const slides = useCanvasStore((s) => s.slides);
  const globalStyles = useCanvasStore((s) => s.globalStyles);
  const isStreaming = useCanvasStore((s) => s.isStreaming);
  const updateEpoch = useCanvasStore((s) => s.updateEpoch);
  const updateSlideHtml = useCanvasStore((s) => s.updateSlideHtml);
  const setGlobalStyles = useCanvasStore((s) => s.setGlobalStyles);
  const bumpEpoch = useCanvasStore((s) => s.bumpEpoch);
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);

  const files = useMemo(() => {
    return useCanvasStore.getState().getVirtualFileTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, globalStyles, isStreaming]);

  // Find the active file from the virtual file tree
  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  // Reset activeFileId when the current file no longer exists (e.g. slide deleted)
  useEffect(() => {
    if (activeFileId === "styles.css") return;
    const stillExists = files.some((f) => f.id === activeFileId);
    if (!stillExists) {
      setActiveFileId("styles.css");
    }
  }, [activeFileId, files]);

  // Selection sync: when user clicks a slide on canvas, switch to that file
  useEffect(() => {
    if (!editingNodeId) return;

    // editingNodeId is a tldraw shape ID like "shape:slide-xxx"
    // We need to find the slideId from it
    const shapeIdStr = String(editingNodeId);

    for (const [slideId] of slides.entries()) {
      // tldraw shape IDs are branded as `shape:{slideId}`
      if (shapeIdStr.includes(slideId)) {
        const matchingFile = files.find((f) => f.slideId === slideId);
        if (matchingFile) {
          setActiveFileId(matchingFile.id);
        }
        break;
      }
    }
  }, [editingNodeId, slides, files]);

  // File selection handler
  const handleFileSelect = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  // Debounced code → canvas sync
  const handleEditorChange = useCallback(
    (value: string) => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const currentFiles = useCanvasStore.getState().getVirtualFileTree();
        const file = currentFiles.find((f) => f.id === activeFileId);
        if (!file) return;

        if (file.id === "styles.css") {
          // Update global styles
          setGlobalStyles(value);
        } else if (file.slideId && file.variantId != null) {
          // Update specific slide HTML
          updateSlideHtml(file.slideId, file.variantId, value);
        }

        // Bump epoch to signal programmatic update (prevents echo loop)
        bumpEpoch();
      }, DEBOUNCE_MS);
    },
    [activeFileId, setGlobalStyles, updateSlideHtml, bumpEpoch],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    activeFileId,
    files,
    activeFile,
    updateEpoch,
    handleFileSelect,
    handleEditorChange,
  };
}
