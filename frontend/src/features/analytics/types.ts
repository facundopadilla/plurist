export interface OperationalSummary {
  publish_requested: number;
  publish_succeeded: number;
  publish_failed: number;
  approval_requested: number;
  approval_approved: number;
  approval_rejected: number;
}

export interface AuditEvent {
  id: number;
  event_type: string;
  actor_id: number | null;
  target_type: string;
  target_id: number;
  metadata: Record<string, unknown>;
  created_at: string;
}
