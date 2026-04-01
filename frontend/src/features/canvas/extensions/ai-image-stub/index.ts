/**
 * AI Image Stub Extension — reference canvas extension.
 *
 * Demonstrates the full extension lifecycle:
 *  1. Define extension metadata + Panel component
 *  2. Register via registerExtension()
 *  3. Appears in the "Extensiones" sidebar
 *
 * This is a scaffold — replace with a real provider (Midjourney, DALL-E,
 * Stable Diffusion) when ready.
 */
import { createElement } from "react";
import { registerExtension, type CanvasExtension } from "../registry";
import { AiImagePanel } from "./ai-image-panel";

export const AI_IMAGE_STUB_ID = "ai-image-stub" as const;

export const aiImageStubExtension: CanvasExtension = {
  meta: {
    id: AI_IMAGE_STUB_ID,
    name: "AI Image (Stub)",
    description: "Genera imágenes placeholder — extensión de referencia",
    icon: createElement("span", { role: "img", "aria-label": "image" }, "🖼️"),
    category: "image",
  },
  Panel: AiImagePanel,
};

/**
 * Register the AI Image Stub extension.
 * Call this once at canvas boot (before <Tldraw> mounts).
 * Safe to call multiple times — will no-op if already registered.
 */
export function registerAiImageStub(): void {
  try {
    registerExtension(aiImageStubExtension);
  } catch {
    // Already registered — no-op (duplicate-ID guard fires in registry)
  }
}
