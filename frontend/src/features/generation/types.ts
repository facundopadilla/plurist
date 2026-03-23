export interface GenerationVariant {
  id: number;
  provider: string;
  model_id: string;
  generated_text: string;
  is_selected: boolean;
  created_at: string;
}

export interface CompareRun {
  id: number;
  status: "pending" | "running" | "completed" | "partial_failure";
  providers: string[];
  campaign_brief: string;
  target_network: string;
  variants: GenerationVariant[];
  created_at: string;
}

export interface ProviderInfo {
  key: string;
  name: string;
}
