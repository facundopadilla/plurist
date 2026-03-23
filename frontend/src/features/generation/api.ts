import { apiRequest } from "../../lib/api/client";
import type { CompareRun, ProviderInfo } from "./types";

export function fetchProviders() {
  return apiRequest<ProviderInfo[]>("/api/v1/generation/providers");
}

export function startCompare(data: {
  brand_profile_version_id: number;
  template_key: string;
  campaign_brief: string;
  target_network?: string;
  providers: string[];
}) {
  return apiRequest<CompareRun>("/api/v1/generation/compare", {
    method: "POST",
    body: data,
  });
}

export function fetchCompareRun(id: number) {
  return apiRequest<CompareRun>(`/api/v1/generation/compare/${id}`);
}

export function selectVariant(compareRunId: number, variantId: number) {
  return apiRequest<{ ok: boolean }>(
    `/api/v1/generation/compare/${compareRunId}/select-variant/${variantId}`,
    { method: "POST" },
  );
}
