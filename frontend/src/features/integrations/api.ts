import { apiRequest } from "../../lib/api/client";
import type { FeatureFlags, SocialConnection } from "./types";

export function fetchConnections(): Promise<SocialConnection[]> {
  return apiRequest<SocialConnection[]>("/api/v1/integrations/connections");
}

export function createConnection(data: {
  network: string;
  display_name: string;
}): Promise<SocialConnection> {
  return apiRequest<SocialConnection>("/api/v1/integrations/connections", {
    method: "POST",
    body: data,
  });
}

export function deleteConnection(
  connectionId: number,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/v1/integrations/connections/${connectionId}`,
    {
      method: "DELETE",
    },
  );
}

export function startOAuthConnect(network: string): void {
  window.location.href = `/api/v1/integrations/oauth/${network}/start`;
}

export function disconnectConnection(
  connectionId: number,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/v1/integrations/oauth/${connectionId}/disconnect`,
    {
      method: "POST",
    },
  );
}

export function fetchFeatureFlags(): Promise<FeatureFlags> {
  return apiRequest<FeatureFlags>("/api/v1/integrations/feature-flags");
}

export function patchFeatureFlags(
  flags: Partial<FeatureFlags>,
): Promise<FeatureFlags> {
  return apiRequest<FeatureFlags>("/api/v1/integrations/feature-flags", {
    method: "PATCH",
    body: flags,
  });
}
