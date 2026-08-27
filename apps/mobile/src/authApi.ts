import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { api, ApiError, firstError, friendlyError } from "./api";
import { API_URL, GOOGLE_REDIRECT_URI } from "./config";
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
  referral_code?: string;
}) {
  const data = await api<AuthPayload>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify({ ...body, legal_accepted: true }),
  });
  return persist(data);
}

export async function loginAccount(identifier: string, password: string, accountType?: AccountType) {
  const data = await api<AuthPayload>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ identifier, password, ...(accountType ? { account_type: accountType } : {}) }),
  });
  return persist(data);
}

export async function loginWithGoogle(
  payload: { idToken?: string; code?: string; redirectUri?: string },
  accountType: AccountType = "user",
) {
  const data = await api<AuthPayload>("/api/auth/google/", {
    method: "POST",
    body: JSON.stringify({
      account_type: accountType,
      legal_accepted: true,
      ...(payload.idToken ? { id_token: payload.idToken } : {}),
      ...(payload.code ? { code: payload.code, redirect_uri: payload.redirectUri || GOOGLE_REDIRECT_URI } : {}),
    }),
  });
  return persist(data);
}

export async function completeBuyerProfile(payload: {
  full_name: string;
  phone: string;
  address: string;
  referral_code?: string;
}) {
  return withAppAuth((token) =>
    api<AppUser>("/api/auth/me/", {
      method: "PATCH",
      token,
      body: JSON.stringify({ ...payload, legal_accepted: true }),
    }),
  );
}

export async function applyBuyerInviteCode(referral_code: string) {
  return withAppAuth((token) =>
    api<AppUser>("/api/auth/me/", {
      method: "PATCH",
      token,
      body: JSON.stringify({ referral_code }),
    }),
  );
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

export async function requestGuestOtp(identifier: string) {
  return api("/api/auth/otp/guest-request/", {
    method: "POST",
    body: JSON.stringify({ purpose: "phone", identifier }),
  });
}

export async function completeProviderRegister(payload: {
  code: string;
  password: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  contact: string;
  service_type: string;
  nagrita_uri: string;
  nagrita_back_uri: string;
  photo_uri: string;
  nation_card_uri: string;
  other_document_uri?: string;
  profile_data?: Record<string, string>;
  referral_code?: string;
}) {
  const data = await api<AuthPayload>("/api/auth/register/provider/complete/", {
    method: "POST",
    body: JSON.stringify({ ...payload, legal_accepted: true }),
  });
  return persist(data);
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

export async function updateProviderPrivacySettings(payload: {
  allow_buyer_calls?: boolean;
  hide_phone_on_ads?: boolean;
}) {
  return withAppAuth((token) =>
    api<AppUser>("/api/auth/me/", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
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
  nation_card_uri?: string;
  other_document_uri?: string;
  profile_data?: Record<string, string>;
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
  nation_card_uri: string;
  other_document_uri?: string;
}) {
  return withAppAuth((token) =>
    api("/api/verification/applications/me/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}

export async function exportMyAccountDataPdf(): Promise<string> {
  return withAppAuth(async (token) => {
    const fileName = `najik-data-export-${Date.now()}.pdf`;
    const url = `${API_URL}/api/auth/me/export/`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
    };

    try {
      const destination = new File(Paths.cache, fileName);
      const downloaded = await File.downloadFileAsync(url, destination, {
        headers,
        idempotent: true,
      });
      return downloaded.uri;
    } catch (primary) {
      const target = `${FileSystemLegacy.cacheDirectory ?? FileSystemLegacy.documentDirectory}${fileName}`;
      const result = await FileSystemLegacy.downloadAsync(url, target, { headers });
      if (result.status < 200 || result.status >= 300) {
        const message = primary instanceof Error ? primary.message : "Could not export account data PDF.";
        throw new ApiError(friendlyError(primary, message), result.status);
      }
      return result.uri;
    }
  });
}

export async function deleteMyAccount(payload: { confirm: string; password?: string }) {
  return withAppAuth((token) =>
    api<{ deleted: boolean }>("/api/auth/me/delete/", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  );
}
