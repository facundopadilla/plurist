export type NetworkId =
  | "instagram"
  | "linkedin"
  | "x"
  | "facebook"
  | "tiktok"
  | "pinterest";

export type PanelId = "chat" | "resources" | "skills" | "extensions" | "code";

export interface VirtualFile {
  id: string;
  filename: string;
  language: "css" | "html";
  content: string;
  slideId?: string;
  variantId?: number;
  readOnly: boolean;
}

export type ResponsiveVariantType = "mobile" | "tablet" | "desktop";
export type VariantType = "default" | ResponsiveVariantType;
export type ContextualAiMode =
  | "generate"
  | "regenerate"
  | "generate-variants"
  | ResponsiveVariantType;

export type CreativeRange = "refine" | "explore" | "reimagine";
export type VariantAspect = "color" | "layout" | "typography" | "content";

export interface GenerateVariantsTarget {
  slideId: string;
}

export interface VariantGenerationMeta {
  sourcePrompt?: string;
  sourceVariantId?: number;
  mode?: ContextualAiMode;
  provider?: string;
  modelId?: string;
  variantType?: VariantType;
  derivedFromVariantId?: number | null;
  variantName?: string;
  creativeRange?: CreativeRange;
  aspects?: VariantAspect[];
}

export interface SlideVariant {
  id: number;
  name?: string;
  provider: string;
  modelId: string;
  html: string;
  text: string;
  variantType?: VariantType;
  derivedFromVariantId?: number | null;
  generationMeta?: VariantGenerationMeta;
}

export interface Annotation {
  id: string;
  text: string;
  createdAt: string;
}

export interface SlideData {
  variants: SlideVariant[];
  activeVariantId: number | null;
  slideIndex: number;
  name?: string;
  isFavorite?: boolean;
  annotations?: Annotation[];
  generationMeta?: VariantGenerationMeta;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  htmlBlocks: Array<{ slideIndex: number; html: string }>;
  createdAt: Date;
  isStreaming?: boolean;
  provider?: string;
  modelId?: string;
  error?: {
    code: string;
    category: string;
    hint: string;
    retryable: boolean;
  };
}

export interface ChatStreamEvent {
  type: "token" | "html_block" | "done" | "error";
  data: Record<string, unknown>;
}

export interface CanvasConfig {
  projectId: number | null;
  network: NetworkId | null;
  formatKey: string;
  formatWidth: number;
  formatHeight: number;
  selectedProviders: string[];
  /** Per-provider model selection: { openai: "gpt-4o", anthropic: "claude-3-5-sonnet-..." } */
  selectedModels: Record<string, string>;
  title: string;
}

/**
 * A reference to a specific element inside an AI-generated HTML shape.
 * Created when the user clicks "Edit with AI" in the inline editing toolbar.
 * The chat sidebar displays this as a chip and injects it into the prompt
 * so the AI knows exactly which element to modify.
 */
export interface ElementReference {
  /** The slide containing the element */
  slideId: string;
  /** Which variant is being edited */
  variantId: number;
  /** CSS selector path from the content root to the element (e.g. "body > div > h1:nth-child(2)") */
  cssPath: string;
  /** The element's tag name (e.g. "h1", "p", "img") */
  tag: string;
  /** Human-readable label (e.g. "Heading", "Text", "Image") — same as hover pill */
  label: string;
  /** Preview of the element's text content (truncated) or src for images */
  contentPreview: string;
  /** The element's current outerHTML (for precise AI context) */
  outerHtml: string;
  /** Slide index for display purposes */
  slideIndex: number;
}

export interface CanvasState {
  // Config (header bar)
  config: CanvasConfig;

  // Slides (node data backing store)
  slides: Map<string, SlideData>;

  // Chat
  conversationId: number | null;
  messages: ChatMessage[];
  isStreaming: boolean;

  // Edit state
  editingNodeId: string | null;

  // Element reference for "Edit with AI"
  elementReference: ElementReference | null;

  // Persistence
  draftPostId: number | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
}
