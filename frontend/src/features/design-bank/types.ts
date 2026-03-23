export interface DesignBankSource {
  id: number;
  source_type: string;
  original_filename: string;
  storage_key: string;
  url: string;
  status: string;
  extracted_data: Record<string, unknown>;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export type SourceStatus = "pending" | "processing" | "ready" | "failed";
