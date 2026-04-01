import { apiRequest } from "../../lib/api/client";
import type { ScheduleEntry } from "./types";

export function fetchEntries(): Promise<ScheduleEntry[]> {
  return apiRequest<ScheduleEntry[]>("/api/v1/scheduler/entries");
}

export function fetchCalendarEntries(
  start: string,
  end: string,
): Promise<ScheduleEntry[]> {
  return apiRequest<ScheduleEntry[]>(
    `/api/v1/scheduler/entries/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
}

export function createEntry(data: {
  draft_post_id: number;
  network: string;
  scheduled_for: string;
  timezone?: string;
}): Promise<ScheduleEntry> {
  return apiRequest<ScheduleEntry>("/api/v1/scheduler/entries", {
    method: "POST",
    body: data,
  });
}

export function cancelEntry(entryId: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/api/v1/scheduler/entries/${entryId}`, {
    method: "DELETE",
  });
}
