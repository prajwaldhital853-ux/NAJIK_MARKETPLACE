import { API_URL } from "./config";
import { noteForcedOffline } from "./sessionKick";

export class ApiError extends Error {
  status: number;
  retryAfter?: number;
  code?: string;

  constructor(message: string, status: number, retryAfter?: number, code?: string) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.code = code;
  }
}

function fromValue(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return text && text !== "undefined" ? text : null;
  }
  if (typeof value === "number") return null;
  if (Array.isArray(value)) return fromValue(value[0], depth + 1);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("detail" in obj) {
      const nested = fromValue(obj.detail, depth + 1);
      if (nested) return nested;
    }
    for (const key of ["non_field_errors", "voice", "voice_file", "image", "identifier", "password", "email", "phone", "code", "reason"]) {
      const nested = fromValue(obj[key], depth + 1);
      if (nested) return nested;
    }
    for (const [key, nested] of Object.entries(obj)) {
      if (key === "retry_after") continue;
      const text = fromValue(nested, depth + 1);
      if (text) return text;
    }
  }
  return null;
}

export function firstError(data: unknown) {
  return fromValue(data) || "Something went wrong. Please try again.";
}

export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError) {
    if (err.message && err.message !== "Something went wrong. Please try again.") {
      return err.status ? `${err.message} (${err.status})` : err.message;
    }
    return err.status ? `${fallback} (${err.status})` : fallback;
  }
  if (err instanceof TypeError || (err instanceof Error && /network request failed|failed to fetch|networkerror/i.test(err.message))) {
    return "Cannot reach NAJIK. Check your internet connection and that the server is running.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError("Cannot reach NAJIK. Check your internet connection and that the server is running.", 0);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const nested =
      data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "object"
        ? ((data as { detail?: { retry_after?: number } }).detail?.retry_after)
        : undefined;
    const retryAfter =
      typeof (data as { retry_after?: number }).retry_after === "number"
        ? (data as { retry_after: number }).retry_after
        : typeof nested === "number"
          ? nested
          : undefined;
    let message = firstError(data);
    if (response.status === 404 && /bookings|inbox|sold/i.test(path)) {
      message = "This feature needs a server update. Ask admin to deploy the latest NAJIK API.";
    }
    const err = new ApiError(
      message,
      response.status,
      retryAfter,
      typeof (data as { code?: unknown }).code === "string" ? (data as { code: string }).code : undefined,
    );
    noteForcedOffline(err.message, err.status);
    throw err;
  }
  return data as T;
}
