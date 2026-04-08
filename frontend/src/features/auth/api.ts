import { ApiError, apiRequest } from "../../lib/api/client";
import type { AuthUser } from "./types";

export function fetchMe() {
  return apiRequest<AuthUser>("/api/v1/auth/me");
}

/**
 * Silent session probe — returns null on 401/403 instead of throwing.
 * Use this for the initial page-load check where unauthenticated state
 * is the expected happy path before login.
 */
export async function fetchMeSilent(): Promise<
  (AuthUser & { csrf_token?: string }) | null
> {
  const response = await fetch("/api/v1/auth/me", { credentials: "include" });
  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "Request failed");
    let detail = text;
    try {
      const data = JSON.parse(text) as { detail?: string };
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      // keep raw text
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as AuthUser & { csrf_token?: string };
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<AuthUser>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logoutSession() {
  return apiRequest<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" });
}

export function acceptInvite(
  token: string,
  name: string,
  password: string,
  confirmPassword: string,
) {
  return apiRequest<{ ok: boolean }>(`/api/v1/auth/invites/${token}/accept`, {
    method: "POST",
    body: { name, password, confirm_password: confirmPassword },
  });
}

export function devSeed() {
  return apiRequest<{ ok: boolean }>("/api/v1/auth/dev-seed", {
    method: "POST",
  });
}

export { ApiError } from "../../lib/api/client";
