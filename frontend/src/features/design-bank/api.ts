import { apiRequest, apiUpload } from "../../lib/api/client";
import type { DesignBankSource } from "./types";

export function fetchSources(): Promise<DesignBankSource[]> {
  return apiRequest<DesignBankSource[]>("/api/v1/design-bank/sources");
}

export function fetchProjectSources(
  projectId: number,
): Promise<DesignBankSource[]> {
  return apiRequest<DesignBankSource[]>(
    `/api/v1/design-bank/sources?project_id=${projectId}`,
  );
}

export function fetchSource(id: number): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>(`/api/v1/design-bank/sources/${id}`);
}

export function uploadFile(
  file: File,
  projectId?: number,
): Promise<DesignBankSource> {
  const formData = new FormData();
  formData.append("file", file);
  const url = projectId
    ? `/api/v1/design-bank/sources/upload?project_id=${projectId}`
    : "/api/v1/design-bank/sources/upload";
  return apiUpload<DesignBankSource>(url, formData);
}

export function ingestUrl(
  url: string,
  projectId?: number,
): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>("/api/v1/design-bank/sources/url", {
    method: "POST",
    body: { url, project_id: projectId ?? null },
  });
}

export function createColorResource(data: {
  name: string;
  hex: string;
  role?: string;
  project_id?: number | null;
}): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>("/api/v1/design-bank/sources/color", {
    method: "POST",
    body: data,
  });
}

export function createFontResource(data: {
  name: string;
  family: string;
  weights?: number[];
  project_id?: number | null;
}): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>("/api/v1/design-bank/sources/font", {
    method: "POST",
    body: data,
  });
}

export function createTextResource(data: {
  name: string;
  content: string;
  kind?: string;
  project_id?: number | null;
}): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>("/api/v1/design-bank/sources/text", {
    method: "POST",
    body: data,
  });
}

export function patchSource(
  id: number,
  data: { name?: string; resource_data?: Record<string, unknown> },
): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>(`/api/v1/design-bank/sources/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function updateSourceContent(
  id: number,
  content: string,
): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>(
    `/api/v1/design-bank/sources/${id}/content`,
    {
      method: "PUT",
      body: { content },
    },
  );
}

export function deleteSource(id: number): Promise<void> {
  return apiRequest<void>(`/api/v1/design-bank/sources/${id}`, {
    method: "DELETE",
  });
}

export function getSourceFileUrl(id: number): string {
  return `/api/v1/design-bank/sources/${id}/file`;
}
