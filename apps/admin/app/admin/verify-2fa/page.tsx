"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { firstAllowedPath } from "@/lib/rbac";
import { mapApiStaff, type StaffApiUser } from "@/lib/staff-api";
import { saveStaffTokens } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { clearPreAuthToken, readPreAuthToken, storePreAuthToken } from "@/lib/twoFactorSession";
import { storeRecoverSetup } from "@/lib/twoFactorRecovery";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const { refreshStaff } = useSession();
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
      saveStaffTokens(data.access, data.refresh);
      const staff = mapApiStaff(data.user);
      router.replace(staff.mustChangePassword ? "/admin/change-password" : firstAllowedPath(staff));
      await refreshStaff();
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
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] px-4 py-8">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-[#111827]">{recover ? "Use a backup code" : "Authenticator code"}</h1>
        <p className="text-[13px] text-[#6b7280]">
          {recover
            ? "Enter one of the backup codes you saved when you set up 2FA."
            : "Open Google Authenticator and enter the current 6-digit code."}
        </p>
        {recover ? (
          <input
            value={backup}
            onChange={(e) => setBackup(e.target.value.toUpperCase())}
            className="w-full rounded-full border border-[#d7ddd9] px-4 py-3 text-center font-mono tracking-wide"
            placeholder="XXXX-XXXX-XXXX"
            required
          />
        ) : (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-full border border-[#d7ddd9] px-4 py-3 text-center font-mono text-lg tracking-[0.3em]"
            placeholder="000000"
            required
          />
        )}
        {error ? <p className="text-center text-[12px] text-[#c62828]">{error}</p> : null}
        <button disabled={busy} className="w-full rounded-full bg-[#1B7D2C] py-3 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Checking…" : recover ? "Reset authenticator" : "Verify & login"}
        </button>
        <button type="button" className="w-full text-[12px] font-semibold text-[#1B7D2C]" onClick={() => setRecover((v) => !v)}>
          {recover ? "Use authenticator code instead" : "Lost your phone? Use a backup code"}
        </button>
        <Link href="/admin/login" className="block text-center text-[12px] text-[#6b7280]">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
