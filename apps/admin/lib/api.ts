const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
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
            : "") ||
          "Something went wrong. Please try again.";
    throw new ApiError(String(detail), response.status);
  }
  return data as T;
}
