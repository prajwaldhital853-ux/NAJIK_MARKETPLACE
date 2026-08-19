import { api, ApiError } from "./api";
import { getAppAccessToken, getAppRefreshToken, saveAppTokens } from "./auth";
import { accessTokenFresh } from "./jwt";
import type { AccountType, AppUser } from "./types";

export type AuthPayload = {
  access: string;
  refresh: string;
  user: AppUser;
};

const REFRESH_SKEW_MS = 60_000;
const KEEP_ALIVE_SKEW_MS = 15 * 60 * 1000;

let refreshInflight: Promise<string> | null = null;

async function persist(data: AuthPayload) {
  await saveAppTokens(data.access, data.refresh);
  return data.user;
}

export async function refreshSession(refresh: string) {
  const data = await api<Omit<AuthPayload, "user">>("/api/auth/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
  await saveAppTokens(data.access, data.refresh);
  return data.access;
}

export async function refreshAppAccess() {
  if (!refreshInflight) {
    refreshInflight = (async () => {
      const refresh = await getAppRefreshToken();
      if (!refresh) throw new Error("Not signed in");
      return refreshSession(refresh);
    })().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

export async function ensureAppAccessToken(skewMs = REFRESH_SKEW_MS) {
  const access = await getAppAccessToken();
  if (accessTokenFresh(access, skewMs)) return access;
  return refreshAppAccess();
}

export async function keepAppSessionAlive() {
  return ensureAppAccessToken(KEEP_ALIVE_SKEW_MS);
}

export async function optionalAppAccessToken() {
  try {
    return await ensureAppAccessToken();
  } catch {
    return null;
  }
}

export async function withAppAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await ensureAppAccessToken();
  try {
    return await fn(token);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    const latest = await getAppAccessToken();
    if (latest && latest !== token && accessTokenFresh(latest, 0)) {
      return fn(latest);
    }
    return fn(await refreshAppAccess());
  }
}

export async function registerAccount(body: {
  full_name: string;
  phone?: string;
  email?: string;
  password: string;
  account_type: AccountType;
}) {
  const data = await api<AuthPayload>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return persist(data);
}

export async function loginAccount(identifier: string, password: string) {
  const data = await api<AuthPayload>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  return persist(data);
}

export async function fetchMe(token: string) {
  return api<AppUser>("/api/auth/me/", { token });
}

export async function logoutAccount(refresh: string, token: string | null) {
  try {
    await api("/api/auth/logout/", {
      method: "POST",
      token,
      body: JSON.stringify({ refresh }),
    });
  } catch {
    // Still wipe local keys.
  }
}

export async function requestOtp(purpose: "phone" | "email", identifier?: string) {
  return withAppAuth((token) =>
    api("/api/auth/otp/request/", {
      method: "POST",
      token,
      body: JSON.stringify({ purpose, identifier }),
    }),
  );
}

export async function verifyOtp(purpose: "phone" | "email", code: string, identifier?: string) {
  return withAppAuth((token) =>
    api<AppUser>("/api/auth/otp/verify/", {
      method: "POST",
      token,
      body: JSON.stringify({ purpose, code, identifier }),
    }),
  );
}

export async function requestPasswordReset(identifier: string) {
  return api<{ detail: string; dev_reset?: { uid: string; token: string } }>("/api/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export async function confirmPasswordReset(uid: string, token: string, password: string) {
  return api("/api/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify({ uid, token, password }),
  });
}

export async function updateBuyerPhoto(photo_uri: string) {
  return withAppAuth((token) =>
    api<AppUser>("/api/auth/me/", {
      method: "PATCH",
      token,
      body: JSON.stringify({ photo_uri }),
    }),
  );
}

export async function fetchSellerApplication() {
  return withAppAuth((token) => api<Record<string, unknown>>("/api/verification/applications/me/", { token }));
}

export async function updateSellerProfile(payload: {
  full_name?: string;
  address?: string;
  contact?: string;
  service_type?: string;
  nagrita_uri?: string;
  nagrita_back_uri?: string;
  photo_uri?: string;
}) {
  return withAppAuth((token) =>
    api("/api/verification/applications/me/", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  );
}

export async function submitSellerApplication(payload: {
  full_name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  service_type: string;
  nagrita_uri: string;
  nagrita_back_uri: string;
  photo_uri: string;
}) {
  return withAppAuth((token) =>
    api("/api/verification/applications/me/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}
