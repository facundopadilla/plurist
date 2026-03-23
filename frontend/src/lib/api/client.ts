import { getCsrfToken, setCsrfToken } from "../../features/auth/csrf";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = getCsrfToken();
  if (existing) return existing;

  const response = await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const data = (await response.json()) as { csrf_token?: string };
  if (data.csrf_token) setCsrfToken(data.csrf_token);
  return getCsrfToken();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...options.headers };
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
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {
    "X-CSRF-Token": await ensureCsrfToken(),
  };

  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((data) => (typeof data?.detail === "string" ? data.detail : "Upload failed"))
      .catch(() => "Upload failed");
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as T;
}
