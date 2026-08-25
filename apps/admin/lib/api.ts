import { getApiBaseUrl } from "./api-config";

export { getApiBaseUrl } from "./api-config";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const apiUrl = getApiBaseUrl();
  // Django APPEND_SLASH requires a trailing slash on POST routes.
  const normalizedPath = path.endsWith("/") || path.includes("?") ? path : `${path}/`;
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${normalizedPath}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new ApiError(
      `${msg}. Check API URL (${apiUrl}) and that the backend is running.`,
      0,
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : data.detail?.detail ||
          data.reason?.[0] ||
          data.non_field_errors?.[0] ||
          data.phone?.[0] ||
          data.email?.[0] ||
          data.identifier?.[0] ||
          (typeof data.detail === "object" && data.detail
            ? String(Object.values(data.detail as object).flat?.()[0] || "")
            : "");
    const fallback =
      response.status === 401
        ? "Session expired. Sign in again."
        : response.status === 404
          ? "API not found (404). Deploy the latest backend and run migrations."
          : response.status >= 500
            ? `Backend error (${response.status}). Try again shortly.`
            : `Request failed (${response.status}).`;
    throw new ApiError(String(detail || fallback), response.status);
  }
  return data as T;
}
