import { apiRequest } from "../../lib/api/client";
import type { DraftFrameMetadata, DraftPost, DraftVariant } from "./types";

// Content-named exports — primary API URL is /api/v1/content/ (Phase 2)

export function fetchContent() {
  return apiRequest<DraftPost[]>("/api/v1/content/");
}

/** @deprecated use fetchContent() */
export const fetchPosts = fetchContent;

export function fetchContentItem(id: number) {
  return apiRequest<DraftPost>(`/api/v1/content/${id}`);
}

/** @deprecated use fetchContentItem() */
export const fetchPost = fetchContentItem;

export function createContent(data: {
  title: string;
  body_text?: string;
  target_networks?: string[];
  project_id?: number | null;
  format?: string;
  html_content?: string;
}) {
  return apiRequest<DraftPost>("/api/v1/content/", {
    method: "POST",
    body: data,
  });
}

/** @deprecated use createContent() */
export const createPost = createContent;

export function submitContentForApproval(postId: number) {
  return apiRequest<DraftPost>(`/api/v1/content/${postId}/submit`, {
    method: "POST",
  });
}

/** @deprecated use submitContentForApproval() */
export const submitForApproval = submitContentForApproval;

export function approveContent(postId: number, reason?: string) {
  return apiRequest<DraftPost>(`/api/v1/content/${postId}/approve`, {
    method: "POST",
    body: { reason: reason ?? "" },
  });
}

/** @deprecated use approveContent() */
export const approvePost = approveContent;

export function rejectContent(postId: number, reason?: string) {
  return apiRequest<DraftPost>(`/api/v1/content/${postId}/reject`, {
    method: "POST",
    body: { reason: reason ?? "" },
  });
}

/** @deprecated use rejectContent() */
export const rejectPost = rejectContent;

export function publishContent(postId: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/content/${postId}/publish`, {
    method: "POST",
  });
}

/** @deprecated use publishContent() */
export const publishPost = publishContent;

export function updateContent(
  postId: number,
  data: {
    title?: string;
    body_text?: string;
    target_networks?: string[];
    project_id?: number | null;
    format?: string;
    html_content?: string;
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

/** @deprecated use updateContent() */
export const updatePost = updateContent;

export function fetchContentVariants(postId: number) {
  return apiRequest<DraftVariant[]>(`/api/v1/content/${postId}/variants`);
}

/** @deprecated use fetchContentVariants() */
export const fetchPostVariants = fetchContentVariants;

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

/** @deprecated use updateContentVariantHtml() */
export const updateVariantHtml = updateContentVariantHtml;
