/**
 * Canvas Extension Registry — types and contracts.
 *
 * An extension is a self-contained unit that adds AI-powered capabilities
 * to the canvas (image generation, text rewriting, style transfer, etc.).
 *
 * Extensions register themselves via the registry and render their UI
 * inside the extension sidebar panel.
 */
import type { ReactNode } from "react";

// ── Extension metadata ─────────────────────────────────────────────

export interface CanvasExtensionMeta {
  /** Unique extension identifier (kebab-case). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Short description shown in the sidebar. */
  description: string;
  /** Lucide icon name or React element for the sidebar entry. */
  icon: ReactNode;
  /** Extension category for grouping in the sidebar. */
  category: ExtensionCategory;
}

export type ExtensionCategory = "image" | "text" | "style" | "layout" | "other";

// ── Extension contract ─────────────────────────────────────────────

export interface CanvasExtension {
  /** Metadata for display in the sidebar. */
  meta: CanvasExtensionMeta;
  /**
   * React component rendered when the extension is activated in the sidebar.
   * Receives the current canvas context (selected shape, iframe ref, etc.).
   */
  Panel: React.ComponentType<ExtensionPanelProps>;
}

export interface ExtensionPanelProps {
  /** ID of the currently selected iframe shape (null if nothing selected). */
  selectedShapeId: string | null;
  /**
   * Inject a generated image URL into the selected iframe shape.
   * Uses iframe-bridge.replaceImage under the hood.
   */
  onInjectImage: (imageUrl: string, selector?: string) => void;
  /**
   * Replace the full HTML of the selected shape.
   * Uses canvas-store.updateSlideHtml under the hood.
   */
  onReplaceHtml: (html: string) => void;
}

// ── Registry ───────────────────────────────────────────────────────

const extensionRegistry = new Map<string, CanvasExtension>();

/**
 * Register a canvas extension. Throws if an extension with the same ID
 * is already registered (prevents silent overwrites).
 */
export function registerExtension(extension: CanvasExtension): void {
  const { id } = extension.meta;
  if (extensionRegistry.has(id)) {
    throw new Error(
      `[canvas-extensions] Duplicate extension ID: "${id}". Each extension must have a unique ID.`,
    );
  }
  extensionRegistry.set(id, extension);
}

/**
 * Unregister a canvas extension by ID. No-op if not found.
 */
export function unregisterExtension(id: string): void {
  extensionRegistry.delete(id);
}

/**
 * Get all registered extensions (snapshot — safe to iterate).
 */
export function getExtensions(): CanvasExtension[] {
  return Array.from(extensionRegistry.values());
}

/**
 * Get a single extension by ID, or undefined if not found.
 */
export function getExtension(id: string): CanvasExtension | undefined {
  return extensionRegistry.get(id);
}

/**
 * Get all extensions in a specific category.
 */
export function getExtensionsByCategory(
  category: ExtensionCategory,
): CanvasExtension[] {
  return getExtensions().filter((ext) => ext.meta.category === category);
}

/**
 * Clear all registered extensions. Useful for testing.
 */
export function clearExtensions(): void {
  extensionRegistry.clear();
}
