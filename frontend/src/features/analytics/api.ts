import { apiRequest } from "../../lib/api/client";
import type { AuditEvent, OperationalSummary } from "./types";

export function fetchSummary(): Promise<OperationalSummary> {
  return apiRequest<OperationalSummary>("/api/v1/analytics/summary");
}

export function fetchTimeline(limit = 50): Promise<AuditEvent[]> {
  return apiRequest<AuditEvent[]>(`/api/v1/analytics/timeline?limit=${limit}`);
}
