"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { STAFF } from "@/lib/demo-data";
import { useSession } from "@/lib/session";
import { inputClass } from "@/components/admin/ui";

export default function StaffLoginPage() {
  const router = useRouter();
  const { login, loginAs } = useSession();
  const [email, setEmail] = useState("admin@najik.com");
  const [password, setPassword] = useState("najikadmin");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const staff = login(email, password);
    if (!staff) {
      setError("Invalid demo credentials, or that account is disabled.");
      return;
    }
    router.replace("/admin");
  }

  const accounts = STAFF.filter((s) => s.status === "active");

  return (
    <main className="flex h-dvh overflow-hidden bg-surface">
      <div className="mx-auto flex h-full w-full max-w-[400px] flex-col px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-brand text-xs font-bold text-white">N</span>
          <div>
            <p className="text-sm font-semibold leading-none text-ink">NAJIK</p>
            <p className="mt-0.5 text-[10px] text-muted">Staff panel</p>
          </div>
        </div>

        <h1 className="mt-6 text-lg font-semibold text-ink">Sign in</h1>
        <p className="mt-1 text-[12px] text-muted">Owners and staff only. Buyers and sellers use the mobile app.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted">Email</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted">Password</span>
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <p className="text-[12px] text-red">{error}</p> : null}
          <button type="submit" className="w-full rounded bg-brand py-2 text-[13px] font-semibold text-white">
            Sign in
          </button>
        </form>

        <p className="mt-5 mb-1.5 text-[10px] font-medium tracking-wide text-muted uppercase">Demo accounts</p>
        <div className="admin-scroll min-h-0 flex-1 overflow-y-auto rounded border border-line bg-card">
          {accounts.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                loginAs(s.id);
                router.replace("/admin");
              }}
              className="flex w-full items-center gap-2 border-b border-line px-2.5 py-1.5 text-left last:border-b-0 hover:bg-elevated"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[9px] font-semibold text-brand">
                {s.name
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-ink">{s.name}</span>
                <span className="block truncate text-[10px] text-muted">{s.role}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-faint">{s.password}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
