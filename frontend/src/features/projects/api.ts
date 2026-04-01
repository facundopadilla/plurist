import { apiRequest, apiUpload } from "../../lib/api/client";
import type { Project, ProjectTag } from "./types";

export function fetchProjects(): Promise<Project[]> {
  return apiRequest<Project[]>("/api/v1/projects/");
}

export function fetchProject(id: number): Promise<Project> {
  return apiRequest<Project>(`/api/v1/projects/${id}`);
}

export function createProject(data: {
  name: string;
  description?: string;
  tags?: ProjectTag[];
  color?: string;
}): Promise<Project> {
  return apiRequest<Project>("/api/v1/projects/", {
    method: "POST",
    body: data,
  });
}

export function updateProject(
  id: number,
  data: {
    name?: string;
    description?: string;
    tags?: ProjectTag[];
    color?: string;
  },
): Promise<Project> {
  return apiRequest<Project>(`/api/v1/projects/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function uploadProjectIcon(id: number, file: File): Promise<Project> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<Project>(`/api/v1/projects/${id}/icon`, form);
}

export function getProjectIconUrl(id: number): string {
  return `/api/v1/projects/${id}/icon`;
}

export function deleteProject(id: number, cascadePosts = false): Promise<void> {
  const url = cascadePosts
    ? `/api/v1/projects/${id}?cascade_posts=true`
    : `/api/v1/projects/${id}`;
  return apiRequest<void>(url, { method: "DELETE" });
}
