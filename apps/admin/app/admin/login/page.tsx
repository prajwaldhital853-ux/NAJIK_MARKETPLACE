"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { inputClass } from "@/components/admin/ui";

export default function StaffLoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState("owner@najik.local");
  const [password, setPassword] = useState("ChangeMeNow!23");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const staff = await login(email, password);
    if (!staff) {
      setError("Invalid credentials.");
      return;
    }
    router.replace("/admin");
  }

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
        <p className="mt-1 text-[12px] text-muted">Use a Django staff account to review live users, KYC and listings.</p>

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
      </div>
    </main>
  );
}
