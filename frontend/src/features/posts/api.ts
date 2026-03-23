import { apiRequest } from "../../lib/api/client";
import type { DraftPost } from "./types";

export function fetchPosts() {
  return apiRequest<DraftPost[]>("/api/v1/posts/");
}

export function fetchPost(id: number) {
  return apiRequest<DraftPost>(`/api/v1/posts/${id}`);
}

export function createPost(data: {
  title: string;
  body_text?: string;
  target_networks?: string[];
  brand_profile_version_id?: number;
  template_key?: string;
}) {
  return apiRequest<DraftPost>("/api/v1/posts/", {
    method: "POST",
    body: data,
  });
}

export function submitForApproval(postId: number) {
  return apiRequest<DraftPost>(`/api/v1/posts/${postId}/submit`, {
    method: "POST",
  });
}

export function approvePost(postId: number, reason?: string) {
  return apiRequest<DraftPost>(`/api/v1/posts/${postId}/approve`, {
    method: "POST",
    body: { reason: reason ?? "" },
  });
}

export function rejectPost(postId: number, reason?: string) {
  return apiRequest<DraftPost>(`/api/v1/posts/${postId}/reject`, {
    method: "POST",
    body: { reason: reason ?? "" },
  });
}

export function publishPost(postId: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/posts/${postId}/publish`, {
    method: "POST",
  });
}
