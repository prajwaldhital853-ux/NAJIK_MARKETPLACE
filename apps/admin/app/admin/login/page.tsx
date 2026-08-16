"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveStaffTokens } from "@/lib/auth";

type LoginResponse = {
  access: string;
  refresh: string;
  user: { email: string; full_name: string };
};

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<LoginResponse>("/api/admin/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveStaffTokens(data.access, data.refresh);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <p className="text-sm font-semibold tracking-widest text-green">NAJIK</p>
        <h1 className="mt-2 text-2xl font-semibold">Staff login</h1>
        <p className="mt-1 text-sm text-muted">
          For owners and staff only. Buyers and sellers use the mobile app.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-green"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-green"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green py-2.5 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
