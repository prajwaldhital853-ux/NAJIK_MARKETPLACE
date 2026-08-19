import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { ApiError } from "../api";
import { clearAppTokens, getAppAccessToken, getAppRefreshToken } from "../auth";
import {
  ensureAppAccessToken,
  fetchMe,
  keepAppSessionAlive,
  loginAccount,
  logoutAccount,
  registerAccount,
  submitSellerApplication,
  updateBuyerPhoto,
  updateSellerProfile,
  verifyOtp,
} from "../authApi";
import { isProvider } from "../demo";
import { pollMyListingsIfChanged, resetListingsPoll } from "../listingsApi";
import { subscribeAppRefresh } from "../listingsRefresh";
import { setLoginHint } from "../loginHint";
import { setAuthSessionActive, setSessionKickHandler } from "../sessionKick";
import type { AccountType, AppUser } from "../types";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  awaitingSignupOtp: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    phone?: string;
    email?: string;
    full_name: string;
    password: string;
    account_type: AccountType;
  }) => Promise<void>;
  verifyContact: (purpose: "phone" | "email", code: string) => Promise<void>;
  submitApplication: (payload: {
    full_name: string;
    address: string;
    contact: string;
    phone: string;
    email: string;
    service_type: string;
    nagrita_uri: string;
    nagrita_back_uri: string;
    photo_uri: string;
  }) => Promise<void>;
  refreshVerification: () => Promise<void>;
  updateBuyerPhoto: (photo_uri: string) => Promise<void>;
  updateSellerProfile: (payload: {
    full_name?: string;
    address?: string;
    contact?: string;
    service_type?: string;
    nagrita_uri?: string;
    nagrita_back_uri?: string;
    photo_uri?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const KEEP_ALIVE_MS = 10 * 60 * 1000;
const ACCOUNT_CHECK_MS = 12_000;
const SELLER_POLL_MS = 5000;

function contactVerified(user: AppUser) {
  return Boolean(user.phone_verified || user.email_verified);
}

function userLiveKey(user: AppUser) {
  return [
    user.id,
    user.verification_status,
    user.application_id,
    user.full_name,
    user.photo_uri,
    user.service_type,
    user.has_pending_edit,
  ].join("|");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [awaitingSignupOtp, setAwaitingSignupOtp] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;
  useEffect(() => {
    setAuthSessionActive(Boolean(user));
  }, [user]);

  useEffect(() => {
    setSessionKickHandler(async () => {
      await clearAppTokens();
      resetListingsPoll();
      setAwaitingSignupOtp(false);
      setUser(null);
    });
    return () => setSessionKickHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const refresh = await getAppRefreshToken();
      if (!refresh) {
        setLoading(false);
        return;
      }
      try {
        const access = await ensureAppAccessToken();
        const me = await fetchMe(access);
        setUser(me);
        if (!isProvider(me) && !contactVerified(me)) setAwaitingSignupOtp(true);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearAppTokens();
          setUser(null);
          setAwaitingSignupOtp(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = async () => {
      try {
        await keepAppSessionAlive();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          await clearAppTokens();
          setUser(null);
          setAwaitingSignupOtp(false);
        }
      }
    };
    void tick();
    const id = setInterval(() => void tick(), KEEP_ALIVE_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void tick();
    });
    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const token = await ensureAppAccessToken();
        const me = await fetchMe(token);
        if (cancelled) return;
        userRef.current = me;
        setUser((prev) => (prev && userLiveKey(prev) === userLiveKey(me) ? prev : me));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          await clearAppTokens();
          resetListingsPoll();
          setUser(null);
          setAwaitingSignupOtp(false);
        }
      }
    };
    void tick();
    const id = setInterval(() => void tick(), ACCOUNT_CHECK_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void tick();
    });
    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !isProvider(user)) return;
    const tick = async () => {
      const current = userRef.current;
      if (!current || !isProvider(current) || current.verification_status !== "verified") return;
      try {
        await pollMyListingsIfChanged();
      } catch {
        /* next tick */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), SELLER_POLL_MS);
    return () => {
      clearInterval(id);
    };
  }, [user?.id, user?.account_type, user?.verification_status]);

  useEffect(() => {
    return subscribeAppRefresh(() => {
      const current = userRef.current;
      if (!current) return;
      void (async () => {
        try {
          const token = await ensureAppAccessToken();
          const me = await fetchMe(token);
          userRef.current = me;
          setUser((prev) => (prev && userLiveKey(prev) === userLiveKey(me) ? prev : me));
          if (isProvider(me) && me.verification_status === "verified") {
            await pollMyListingsIfChanged();
          }
        } catch {
          /* keep current session */
        }
      })();
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      awaitingSignupOtp,
      async login(identifier, password) {
        const me = await loginAccount(identifier, password);
        resetListingsPoll();
        setAwaitingSignupOtp(false);
        setUser(me);
      },
      async register(payload) {
        const me = await registerAccount(payload);
        setUser(me);
        setAwaitingSignupOtp(!isProvider(me));
      },
      async verifyContact(purpose, code) {
        const me = await verifyOtp(purpose, code);
        if (!isProvider(me)) {
          setLoginHint("Phone verified. Sign in to continue.", me.phone || me.email || undefined);
          const refresh = await getAppRefreshToken();
          const access = await getAppAccessToken();
          if (refresh) await logoutAccount(refresh, access);
          await clearAppTokens();
          setAwaitingSignupOtp(false);
          setUser(null);
          return;
        }
        setUser(me);
      },
      async submitApplication(payload) {
        await submitSellerApplication(payload);
        const token = await ensureAppAccessToken();
        setUser(await fetchMe(token));
      },
      async refreshVerification() {
        try {
          const token = await ensureAppAccessToken();
          setUser(await fetchMe(token));
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            await clearAppTokens();
            setUser(null);
          }
        }
      },
      async updateBuyerPhoto(photo_uri) {
        setUser(await updateBuyerPhoto(photo_uri));
      },
      async updateSellerProfile(payload) {
        await updateSellerProfile(payload);
        const token = await ensureAppAccessToken();
        setUser(await fetchMe(token));
      },
      async logout() {
        const refresh = await getAppRefreshToken();
        const access = await getAppAccessToken();
        if (refresh) await logoutAccount(refresh, access);
        await clearAppTokens();
        resetListingsPoll();
        setAwaitingSignupOtp(false);
        setUser(null);
      },
    }),
    [user, loading, awaitingSignupOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
