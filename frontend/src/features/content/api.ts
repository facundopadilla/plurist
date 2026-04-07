import { apiRequest } from "../../lib/api/client";
import type { DraftFrameMetadata, DraftPost, DraftVariant } from "./types";

export function fetchContent() {
  return apiRequest<DraftPost[]>("/api/v1/content/");
}

export function fetchContentItem(id: number) {
  return apiRequest<DraftPost>(`/api/v1/content/${id}`);
}

export function createContent(data: {
  title: string;
  body_text?: string;
  project_id?: number | null;
  format?: string;
  html_content?: string;
  global_styles?: string;
}) {
  return apiRequest<DraftPost>("/api/v1/content/", {
    method: "POST",
    body: data,
  });
}

export function completeContent(postId: number) {
  return apiRequest<DraftPost>(`/api/v1/content/${postId}/complete`, {
    method: "POST",
  });
}

export function revertContent(postId: number) {
  return apiRequest<DraftPost>(`/api/v1/content/${postId}/revert`, {
    method: "POST",
  });
}

export function deleteContent(postId: number) {
  return apiRequest<void>(`/api/v1/content/${postId}`, {
    method: "DELETE",
  });
}

export function updateContent(
  postId: number,
  data: {
    title?: string;
    body_text?: string;
    project_id?: number | null;
    format?: string;
    html_content?: string;
    global_styles?: string;
    frame_metadata?: DraftFrameMetadata[];
    variants?: Array<{
      local_id: number;
      slide_index: number | null;
      provider: string;
      model_id: string;
      generated_html: string;
      generated_text: string;
      variant_type?: string;
      derived_from_local_id?: number | null;
      generation_meta?: Record<string, unknown>;
    }>;
  },
) {
  return apiRequest<DraftPost>(`/api/v1/content/${postId}`, {
    method: "PATCH",
    body: data,
  });
}

export function fetchContentVariants(postId: number) {
  return apiRequest<DraftVariant[]>(`/api/v1/content/${postId}/variants`);
}

export function updateContentVariantHtml(
  postId: number,
  variantId: number,
  html: string,
) {
  return apiRequest<DraftVariant>(
    `/api/v1/content/${postId}/variants/${variantId}`,
    {
      method: "PUT",
      body: { generated_html: html },
    },
  );
}
