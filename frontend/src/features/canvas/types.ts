export type NetworkId = "instagram" | "linkedin" | "x";

export type PanelId = "chat" | "resources" | "extensions" | "code";

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

  // Persistence
  draftPostId: number | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
}
