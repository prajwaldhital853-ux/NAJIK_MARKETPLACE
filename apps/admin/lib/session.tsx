"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Staff } from "./demo-data";
import { ApiError } from "./api";
import { clearStaffTokens } from "./auth";
import { keepStaffSessionAlive, restoreStaffApiSession, staffApiLogin, staffApiVerifyLogin } from "./staff-api";
import { OPEN_INBOX_KEY } from "./live-inbox";

const KEEP_ALIVE_MS = 10 * 60 * 1000;

const SessionCtx = createContext<{
  staff: Staff | null;
  ready: boolean;
  apiSession: boolean;
  login: (email: string, password: string) => Promise<{ staff?: Staff; verify?: { staffId: string; email: string; message: string; debugCode?: string } }>;
  verifyLogin: (staffId: string, code: string) => Promise<Staff>;
  logout: () => void;
  refreshStaff: () => Promise<Staff | null>;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [apiSession, setApiSession] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const logout = useCallback(() => {
    clearStaffTokens();
    sessionStorage.removeItem(OPEN_INBOX_KEY);
    setStaff(null);
    setApiSession(false);
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const live = await restoreStaffApiSession();
        if (live) {
          setStaff(live);
          setApiSession(true);
          setReady(true);
          return;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearStaffTokens();
        }
      }
      setStaff(null);
      setApiSession(false);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!staff) return;
    let cancelled = false;
    const tick = async () => {
      try {
        await keepStaffSessionAlive();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), KEEP_ALIVE_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [staff, logout]);

  useEffect(() => {
    if (!ready) return;
    if (pathname.startsWith("/admin/login")) return;
    if (!pathname.startsWith("/admin")) return;
    if (!staff) router.replace("/admin/login");
  }, [ready, staff, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await staffApiLogin(email, password);
      if (result.status === "verify") {
        return {
          verify: {
            staffId: result.staffId,
            email: result.email,
            message: result.message,
            debugCode: result.debugCode,
          },
        };
      }
      sessionStorage.setItem(OPEN_INBOX_KEY, "1");
      setStaff(result.staff);
      setApiSession(true);
      return { staff: result.staff };
    } catch (err) {
      clearStaffTokens();
      setStaff(null);
      setApiSession(false);
      throw err;
    }
  }, []);

  const verifyLogin = useCallback(async (staffId: string, code: string) => {
    try {
      const live = await staffApiVerifyLogin(staffId, code);
      sessionStorage.setItem(OPEN_INBOX_KEY, "1");
      setStaff(live);
      setApiSession(true);
      return live;
    } catch (err) {
      clearStaffTokens();
      setStaff(null);
      setApiSession(false);
      throw err;
    }
  }, []);

  const refreshStaff = useCallback(async () => {
    try {
      const live = await restoreStaffApiSession();
      if (live) {
        setStaff(live);
        setApiSession(true);
        return live;
      }
    } catch {
      logout();
    }
    return null;
  }, [logout]);

  const value = useMemo(
    () => ({ staff, ready, apiSession, login, verifyLogin, logout, refreshStaff }),
    [staff, ready, apiSession, login, verifyLogin, logout, refreshStaff],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
