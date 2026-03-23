import { apiRequest, apiUpload } from "../../lib/api/client";
import type { DesignBankSource } from "./types";

export function fetchSources(): Promise<DesignBankSource[]> {
  return apiRequest<DesignBankSource[]>("/api/v1/design-bank/sources");
}

export function fetchSource(id: number): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>(`/api/v1/design-bank/sources/${id}`);
}

export function uploadFile(file: File): Promise<DesignBankSource> {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<DesignBankSource>("/api/v1/design-bank/sources/upload", formData);
}

export function ingestUrl(url: string): Promise<DesignBankSource> {
  return apiRequest<DesignBankSource>("/api/v1/design-bank/sources/url", {
    method: "POST",
    body: { url },
  });
}
