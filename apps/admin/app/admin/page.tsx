"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  clearStaffTokens,
  getStaffAccessToken,
  getStaffRefreshToken,
} from "@/lib/auth";

type StaffMe = {
  email: string;
  full_name: string;
  is_super_admin: boolean;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMe | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStaffAccessToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    api<StaffMe>("/api/admin/auth/me/", { token })
      .then(setStaff)
      .catch(() => {
        clearStaffTokens();
        router.replace("/admin/login");
      });
  }, [router]);

  async function logout() {
    const token = getStaffAccessToken();
    const refresh = getStaffRefreshToken();
    try {
      if (token && refresh) {
        await api("/api/admin/auth/logout/", {
          method: "POST",
          token,
          body: JSON.stringify({ refresh }),
        });
      }
    } catch {
      // Still clear local tokens.
    }
    clearStaffTokens();
    router.replace("/admin/login");
  }

  if (!staff && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-widest text-green">NAJIK</p>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        </div>
        <button
          onClick={logout}
          className="rounded-xl border border-border px-4 py-2 text-sm hover:border-green"
        >
          Log out
        </button>
      </header>
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="text-muted text-sm">Signed in as</p>
        <p className="mt-1 text-lg font-medium">{staff?.full_name || staff?.email}</p>
        <p className="text-sm text-muted">{staff?.email}</p>
        <p className="mt-4 text-sm text-muted">
          Charts, listings, and moderation come in later features. This screen
          only confirms staff auth is working.
        </p>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>
    </main>
  );
}
