export interface DesignBankSource {
  id: number;
  source_type: string;
  name: string;
  original_filename: string;
  storage_key: string;
  url: string;
  status: string;
  extracted_data: Record<string, unknown>;
  resource_data: Record<string, unknown>;
  error_message: string;
  project_id: number | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export type SourceStatus = "pending" | "processing" | "ready" | "failed";

export interface ProjectDesignSystemStatus {
  has_design_system: boolean;
  has_reference_brief: boolean;
  has_relevant_sources: boolean;
  is_outdated: boolean;
  relevant_source_count: number;
  last_relevant_source_at: string | null;
  artifact_revision: string | null;
  design_system_source_id: number | null;
  reference_brief_source_id: number | null;
  has_manual_edits: boolean;
}

export interface SyncProjectDesignSystemResult {
  ok: boolean;
  status: ProjectDesignSystemStatus;
  design_system_source_id: number;
  reference_brief_source_id: number;
}
