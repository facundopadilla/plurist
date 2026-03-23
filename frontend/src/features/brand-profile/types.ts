export interface BrandProfileVersion {
  id: number;
  version: number;
  profile_data: {
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
  };
  created_at: string;
  created_by_email: string | null;
}
