import type {
  Annotation,
  VariantGenerationMeta,
  VariantType,
} from "../canvas/types";

export interface DraftVariant {
  id: number;
  provider: string;
  model_id: string;
  generated_text: string;
  generated_html: string;
  slide_index: number | null;
  variant_type?: VariantType;
  derived_from_variant_id?: number | null;
  generation_meta?: VariantGenerationMeta;
  created_at: string;
}

export interface DraftFrameMetadata {
  slide_index: number;
  name: string;
  is_favorite: boolean;
  annotations: Annotation[];
}

export type PostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "publishing"
  | "published"
  | "failed";

export interface DraftPost {
  id: number;
  title: string;
  body_text: string;
  status: PostStatus;
  target_networks: string[];
  render_asset_key: string;
  project_id: number | null;
  format: string;
  html_content: string;
  submitted_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  failure_message: string;
  frame_metadata?: DraftFrameMetadata[];
  variants?: DraftVariant[];
}

/** Semantic alias for UI code — maps 1:1 to DraftPost API shape */
export type ContentItem = DraftPost;

/** Semantic alias for UI code — maps 1:1 to PostStatus */
export type ContentStatus = PostStatus;
