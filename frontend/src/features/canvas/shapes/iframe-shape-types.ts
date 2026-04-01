/**
 * IframeShape — tldraw custom shape for rendering AI-generated HTML content.
 *
 * Each IframeShape represents a single content artifact (Instagram post,
 * website, slide, story) rendered inside a sandboxed iframe with srcdoc.
 *
 * Each shape corresponds to a single slide in the canvas store.
 */
import type { RecordProps, TLShape } from "tldraw";
import { T } from "tldraw";

// ── Shape type constant ────────────────────────────────────────────
export const IFRAME_SHAPE_TYPE = "iframe-shape" as const;

// ── Augment tldraw's global shape registry ─────────────────────────
declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [IFRAME_SHAPE_TYPE]: IframeShapeProps;
  }
}

// ── Shape props ────────────────────────────────────────────────────
export interface IframeShapeProps {
  /** Width of the content format in px (e.g. 1080 for IG square). */
  w: number;
  /** Height of the content format in px (e.g. 1080 for IG square). */
  h: number;
  /** The HTML content rendered via iframe srcdoc. */
  html: string;
  /** Unique slide identifier (maps to canvas-store slides Map key). */
  slideId: string;
  /** Positional index within the content sequence. */
  slideIndex: number;
}

// ── Validated props schema (tldraw validators) ─────────────────────
export const iframeShapeProps: RecordProps<TLShape<typeof IFRAME_SHAPE_TYPE>> =
  {
    w: T.number,
    h: T.number,
    html: T.string,
    slideId: T.string,
    slideIndex: T.number,
  };

// ── Derived type shortcut ──────────────────────────────────────────
export type IframeShape = TLShape<typeof IFRAME_SHAPE_TYPE>;
