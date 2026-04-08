import {
  clearCsrfToken,
  getCsrfToken,
  setCsrfToken,
} from "../../features/auth/csrf";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  const existing = getCsrfToken();
  if (existing && !forceRefresh) return existing;

  const response = await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const data = (await response.json()) as { csrf_token?: string };
  if (data.csrf_token) setCsrfToken(data.csrf_token);
  return getCsrfToken();
}

async function parseErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  return response
    .json()
    .then((data) => (typeof data?.detail === "string" ? data.detail : fallback))
    .catch(() => fallback);
}

function shouldRetryCsrf(
  method?: RequestOptions["method"],
  status?: number,
  detail?: string,
) {
  return Boolean(
    method && method !== "GET" && status === 403 && detail === "CSRF Failed",
  );
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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const attempt = async (forceRefresh = false): Promise<T> => {
    const headers: Record<string, string> = { ...options.headers };
    let requestBody: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(options.body);
    }
    if (options.method && options.method !== "GET") {
      headers["X-CSRF-Token"] = await ensureCsrfToken(forceRefresh);
    }

    const response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "include",
      headers,
      body: requestBody,
    });

    if (response.ok) {
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        return undefined as T;
      }

      return (await response.json()) as T;
    }

    const detail = await parseErrorDetail(response, "Request failed");
    if (
      shouldRetryCsrf(options.method, response.status, detail) &&
      forceRefresh === false
    ) {
      clearCsrfToken();
      return attempt(true);
    }
    throw new ApiError(response.status, detail);
  };

  return attempt();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const attempt = async (forceRefresh = false): Promise<T> => {
    const headers: Record<string, string> = {
      "X-CSRF-Token": await ensureCsrfToken(forceRefresh),
    };

    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const detail = await parseErrorDetail(response, "Upload failed");
      if (shouldRetryCsrf("POST", response.status, detail) && !forceRefresh) {
        clearCsrfToken();
        return attempt(true);
      }
      throw new ApiError(response.status, detail);
    }

    return (await response.json()) as T;
  };

  return attempt();
}
