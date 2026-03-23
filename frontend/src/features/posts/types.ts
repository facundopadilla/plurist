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
  brand_profile_version_id: number | null;
  template_definition_id: number | null;
  selected_variant_id: number | null;
  render_asset_key: string;
  created_at: string;
  updated_at: string;
}
