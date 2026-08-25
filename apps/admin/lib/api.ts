import { getApiBaseUrl } from "./api-config";
import { formatAdminError } from "./rbac-errors";

export { getApiBaseUrl } from "./api-config";

export type ApiLockoutInfo = {
  lockedUntil: string;
  secondsRemaining: number;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  lockout?: ApiLockoutInfo;

  constructor(message: string, status: number, extras?: { code?: string; lockout?: ApiLockoutInfo }) {
    super(message);
    this.status = status;
    this.code = extras?.code;
    this.lockout = extras?.lockout;
  }
}

function parseApiLockout(data: Record<string, unknown>): ApiLockoutInfo | undefined {
  if (data.code !== "account_locked" || typeof data.locked_until !== "string") return undefined;
  const seconds =
    typeof data.seconds_remaining === "number"
      ? Math.max(0, data.seconds_remaining)
      : Math.max(0, Math.ceil((Date.parse(data.locked_until) - Date.now()) / 1000));
  return { lockedUntil: data.locked_until, secondsRemaining: seconds };
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
    const payload = (typeof data === "object" && data ? data : {}) as Record<string, unknown>;
    const detail =
      typeof payload.detail === "string"
        ? payload.detail
        : (payload.detail as { detail?: string } | undefined)?.detail ||
          (payload.reason as string[] | undefined)?.[0] ||
          (payload.non_field_errors as string[] | undefined)?.[0] ||
          (payload.phone as string[] | undefined)?.[0] ||
          (payload.email as string[] | undefined)?.[0] ||
          (payload.identifier as string[] | undefined)?.[0] ||
          (typeof payload.detail === "object" && payload.detail
            ? String(Object.values(payload.detail as object).flat?.()[0] || "")
            : "");
    const fallback =
      response.status === 401
        ? "Session expired. Sign in again."
        : response.status === 403
          ? "Read-only access: you don't have permission for this action. Ask your Super Admin to update your role."
        : response.status === 423
          ? "Account locked due to too many failed login attempts."
        : response.status === 404
          ? "API not found (404). Deploy the latest backend and run migrations."
          : response.status >= 500
            ? `Backend error (${response.status}). Try again shortly.`
            : `Request failed (${response.status}).`;
    const message = String(detail || fallback);
    const lockout = parseApiLockout(payload);
    const code = typeof payload.code === "string" ? payload.code : lockout ? "account_locked" : undefined;
    throw new ApiError(
      response.status === 403 ? formatAdminError(new ApiError(message, 403)) : message,
      response.status,
      { code, lockout },
    );
  }
  return data as T;
}
