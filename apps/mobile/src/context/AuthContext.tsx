import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearAppTokens, getDemoUser, saveDemoUser } from "../auth";
import { AUTO_VERIFY_PROVIDERS } from "../config";
import { DEMO_USER } from "../demo";
import { getProviderApplication, findProviderByContact, applicationToUser } from "../providersApi";
import type { AppUser } from "../types";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  login: (partial?: Partial<AppUser>) => Promise<void>;
  register: (payload: { phone?: string; email?: string; full_name: string; password?: string; account_type?: AppUser["account_type"] }) => Promise<void>;
  updateUser: (partial: Partial<AppUser>) => Promise<void>;
  refreshVerification: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mergeDemo(partial?: Partial<AppUser>): AppUser {
  return {
    ...DEMO_USER,
    ...partial,
    full_name: partial?.full_name?.trim() || DEMO_USER.full_name,
    phone: partial?.phone?.trim() || DEMO_USER.phone,
    email: partial?.email !== undefined ? partial.email : DEMO_USER.email,
    account_type: partial?.account_type || DEMO_USER.account_type,
    verification_status: partial?.verification_status ?? DEMO_USER.verification_status ?? "none",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getDemoUser();
      if (stored) {
        setUser({
          ...DEMO_USER,
          ...stored,
          account_type: stored.account_type || "user",
          verification_status:
            stored.account_type === "provider"
              ? AUTO_VERIFY_PROVIDERS && stored.verification_status !== "rejected"
                ? "verified"
                : stored.verification_status || "pending"
              : "none",
        });
      }
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(partial) {
        let resolved = partial;
        if (partial?.account_type !== "provider") {
          const app = await findProviderByContact({
            email: partial?.email?.trim() || undefined,
            phone: partial?.phone?.replace(/\s/g, "") || undefined,
          });
          if (app) {
            resolved = { ...partial, ...applicationToUser(app) };
          }
        }
        const next = mergeDemo(resolved);
        setUser(next);
        void saveDemoUser(next);
      },
      async register(payload) {
        const next = mergeDemo({
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email ?? null,
          account_type: payload.account_type,
        });
        setUser(next);
        void saveDemoUser(next);
      },
      async updateUser(partial) {
        const next = mergeDemo({ ...user, ...partial });
        setUser(next);
        void saveDemoUser(next);
      },
      async refreshVerification() {
        if (!user?.application_id) return;
        const app = await getProviderApplication(user.application_id);
        if (!app) return;
        const status = AUTO_VERIFY_PROVIDERS && app.status !== "rejected" ? "verified" : app.status;
        const next = mergeDemo({ ...user, verification_status: status });
        setUser(next);
        void saveDemoUser(next);
      },
      async logout() {
        await clearAppTokens();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
