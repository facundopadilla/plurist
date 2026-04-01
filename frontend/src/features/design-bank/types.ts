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
