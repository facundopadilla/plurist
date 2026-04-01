export interface GenerationVariant {
  id: number;
  provider: string;
  model_id: string;
  generated_text: string;
  generated_html: string;
  is_selected: boolean;
  slide_index: number | null;
  created_at: string;
}

export interface CompareRun {
  id: number;
  status: "pending" | "running" | "completed" | "partial_failure";
  providers: string[];
  campaign_brief: string;
  target_network: string;
  format: string;
  slide_count: number | null;
  width: number;
  height: number;
  variants: GenerationVariant[];
  created_at: string;
}

export interface FormatOut {
  key: string;
  label: string;
  width: number;
  height: number;
  network: string;
}

export interface ProviderInfo {
  key: string;
  name: string;
}

export interface OllamaModel {
  name: string;
  display_name: string;
}
