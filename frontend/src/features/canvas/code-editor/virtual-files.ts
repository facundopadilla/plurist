import { useCanvasStore } from "../canvas-store";
import type { VirtualFile } from "../types";

/**
 * Derives the virtual file tree from the canvas store.
 * Returns a stable array of VirtualFile objects representing:
 * - styles.css (global CSS)
 * - slide-N.html (one per slide, ordered by slideIndex)
 */
export function useVirtualFileTree(): VirtualFile[] {
  return useCanvasStore((s) => s.getVirtualFileTree());
}

/**
 * Returns the VirtualFile for a given file ID, or undefined if not found.
 */
export function useVirtualFile(fileId: string): VirtualFile | undefined {
  return useCanvasStore((s) =>
    s.getVirtualFileTree().find((f) => f.id === fileId),
  );
}

/**
 * Non-hook version for use outside of React components.
 */
export function getVirtualFileTree(): VirtualFile[] {
  return useCanvasStore.getState().getVirtualFileTree();
}
