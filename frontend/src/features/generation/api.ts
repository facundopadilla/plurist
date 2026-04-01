import { apiRequest } from "../../lib/api/client";
import type { CompareRun, FormatOut, OllamaModel } from "./types";

export function fetchProviders() {
  return apiRequest<string[]>("/api/v1/generation/providers");
}

export function fetchFormats() {
  return apiRequest<FormatOut[]>("/api/v1/rendering/formats");
}

export function fetchOllamaModels() {
  return apiRequest<OllamaModel[]>("/api/v1/generation/ollama/models");
}

export function startCompare(data: {
  campaign_brief: string;
  target_network?: string;
  providers: string[];
  template_key?: string;
  brand_profile_version_id?: number | null;
  project_id?: number | null;
  format?: string;
  slide_count?: number | null;
  width?: number;
  height?: number;
}) {
  return apiRequest<CompareRun>("/api/v1/generation/compare", {
    method: "POST",
    body: data,
  });
}

export function fetchCompareRun(id: number) {
  return apiRequest<CompareRun>(`/api/v1/generation/compare/${id}`);
}

export function selectVariant(
  compareRunId: number,
  variantId: number,
  slideIndex: number = 0,
) {
  return apiRequest<{ ok: boolean }>(
    `/api/v1/generation/compare/${compareRunId}/select-variant/${variantId}`,
    { method: "POST", body: { slide_index: slideIndex } },
  );
}
