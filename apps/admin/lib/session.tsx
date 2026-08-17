"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { STAFF, type Staff } from "./demo-data";

const KEY = "najik_admin_staff_id";

const SessionCtx = createContext<{
  staff: Staff | null;
  ready: boolean;
  login: (email: string, password: string) => Staff | null;
  loginAs: (id: string) => void;
  logout: () => void;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const id = sessionStorage.getItem(KEY);
    const found = STAFF.find((s) => s.id === id) ?? null;
    setStaff(found);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (pathname.startsWith("/admin/login")) return;
    if (!pathname.startsWith("/admin")) return;
    if (!staff) router.replace("/admin/login");
  }, [ready, staff, pathname, router]);

  function login(email: string, password: string) {
    const found = STAFF.find(
      (s) => s.email.toLowerCase() === email.trim().toLowerCase() && s.password === password,
    );
    if (!found || found.status === "disabled") return null;
    sessionStorage.setItem(KEY, found.id);
    setStaff(found);
    return found;
  }

  function loginAs(id: string) {
    const found = STAFF.find((s) => s.id === id);
    if (!found || found.status === "disabled") return;
    sessionStorage.setItem(KEY, found.id);
    setStaff(found);
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    setStaff(null);
    router.replace("/admin/login");
  }

  const value = useMemo(() => ({ staff, ready, login, loginAs, logout }), [staff, ready]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
