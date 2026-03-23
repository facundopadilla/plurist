import { apiRequest } from "../../lib/api/client";
import type { BrandProfileVersion } from "./types";

export function fetchVersions() {
  return apiRequest<BrandProfileVersion[]>("/api/v1/brand-profile/versions");
}

export function fetchActiveVersion() {
  return apiRequest<BrandProfileVersion>("/api/v1/brand-profile/versions/active");
}

export function fetchVersion(id: number) {
  return apiRequest<BrandProfileVersion>(`/api/v1/brand-profile/versions/${id}`);
}

export function createVersion(data: {
  brand_name?: string;
  voice_notes?: string;
  logo_asset_keys?: string[];
  icon_asset_keys?: string[];
  primary_color?: string;
  secondary_color?: string;
  neutral_color?: string;
  accent_color?: string;
  approved_fonts?: string[];
  slogans?: string[];
  imagery_references?: string[];
  source_ids?: number[];
}) {
  return apiRequest<BrandProfileVersion>("/api/v1/brand-profile/versions", {
    method: "POST",
    body: data,
  });
}
