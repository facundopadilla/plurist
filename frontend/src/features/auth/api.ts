import { getCsrfToken, setCsrfToken } from "./csrf";
import type { AuthUser } from "./types";

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = getCsrfToken();
  if (existing) {
    return existing;
  }

  const response = await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const data = (await response.json()) as { csrf_token?: string };
  if (data.csrf_token) {
    setCsrfToken(data.csrf_token);
  }
  return getCsrfToken();
}

async function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.method && options.method !== "GET") {
    headers["X-CSRF-Token"] = await ensureCsrfToken();
  }

  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((data) => (typeof data?.detail === "string" ? data.detail : "Request failed"))
      .catch(() => "Request failed");
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export function fetchMe() {
  return authRequest<AuthUser>("/api/v1/auth/me");
}

export function loginWithPassword(email: string, password: string) {
  return authRequest<AuthUser>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logoutSession() {
  return authRequest<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" });
}

export function acceptInvite(token: string, name: string, password: string, confirmPassword: string) {
  return authRequest<{ ok: boolean }>(`/api/v1/auth/invites/${token}/accept`, {
    method: "POST",
    body: { name, password, confirm_password: confirmPassword },
  });
}

export function devSeed() {
  return authRequest<{ ok: boolean }>("/api/v1/auth/dev-seed", {
    method: "POST",
  });
}
