export interface SocialConnection {
  id: number;
  network: string;
  display_name: string;
  is_active: boolean;
  provider_username: string;
  status: "connected" | "expired" | "error" | "revoked";
  token_expires_at: string | null;
  error_detail: string;
}

export interface FeatureFlags {
  linkedin: boolean;
  x: boolean;
  instagram: boolean;
}
