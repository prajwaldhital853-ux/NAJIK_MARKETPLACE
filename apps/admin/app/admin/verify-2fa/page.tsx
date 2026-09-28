"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { firstAllowedPath } from "@/lib/rbac";
import { type StaffApiUser } from "@/lib/staff-api";
import { useSession } from "@/lib/session";
import { clearPreAuthToken, readPreAuthToken, storePreAuthToken } from "@/lib/twoFactorSession";
import { storeRecoverSetup } from "@/lib/twoFactorRecovery";

const inputClass =
  "w-full rounded-full border border-line bg-elevated px-4 py-3 text-center font-mono text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-[3px] focus:ring-brand/15";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const { completeStaffLogin } = useSession();
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);

  useEffect(() => {
    if (!readPreAuthToken()) router.replace("/admin/login");
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const preAuthToken = readPreAuthToken();
    setBusy(true);
    setError("");
    try {
      if (recover) {
        const data = await api<{ preAuthToken: string; qrCodeDataUrl?: string; secret?: string; otpauthUrl?: string }>(
          "/api/admin/auth/2fa/recover/",
          { method: "POST", body: JSON.stringify({ preAuthToken, backupCode: backup }) },
        );
        storePreAuthToken(data.preAuthToken);
        storeRecoverSetup(data);
        router.replace("/admin/setup-2fa?recover=1");
        return;
      }
      const normalized = code.replace(/\s/g, "");
      const data = await api<{ access: string; refresh: string; user: StaffApiUser }>(
        "/api/admin/auth/2fa/verify/",
        { method: "POST", body: JSON.stringify({ preAuthToken, code: normalized }) },
      );
      clearPreAuthToken();
      const staff = completeStaffLogin(data.access, data.refresh, data.user);
      router.replace(staff.mustChangePassword ? "/admin/change-password" : firstAllowedPath(staff));
    } catch (err) {
      if (err instanceof ApiError && err.code === "totp_locked") {
        clearPreAuthToken();
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-8 text-ink">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-card p-6 shadow-lg"
      >
        <h1 className="text-xl font-bold text-ink">{recover ? "Use a backup code" : "Authenticator code"}</h1>
        <p className="text-[13px] text-muted">
          {recover
            ? "Enter one of the backup codes you saved when you set up 2FA."
            : "Open Google Authenticator and enter the current 6-digit code."}
        </p>
        {recover ? (
          <input
            value={backup}
            onChange={(e) => setBackup(e.target.value.toUpperCase())}
            className={`${inputClass} tracking-wide`}
            placeholder="XXXX-XXXX-XXXX"
            required
          />
        ) : (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className={`${inputClass} text-lg tracking-[0.3em]`}
            placeholder="000000"
            required
          />
        )}
        {error ? <p className="text-center text-[12px] text-red">{error}</p> : null}
        <button
          disabled={busy}
          className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Checking…" : recover ? "Reset authenticator" : "Verify & login"}
        </button>
        <button
          type="button"
          className="w-full text-[12px] font-semibold text-brand hover:underline"
          onClick={() => setRecover((v) => !v)}
        >
          {recover ? "Use authenticator code instead" : "Lost your phone? Use a backup code"}
        </button>
        <Link href="/admin/login" className="block text-center text-[12px] text-muted hover:text-ink">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
