"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackupCodesPanel } from "@/components/admin/backup-codes-panel";
import { api, ApiError } from "@/lib/api";
import { firstAllowedPath } from "@/lib/rbac";
import { type StaffApiUser } from "@/lib/staff-api";
import { useSession } from "@/lib/session";
import { clearRecoverSetup, isRecoverSetupRoute, readRecoverSetup } from "@/lib/twoFactorRecovery";
import { clearPreAuthToken, readPreAuthToken } from "@/lib/twoFactorSession";

type SetupPayload = { qrCodeDataUrl?: string; secret?: string };

const inputClass =
  "w-full rounded-full border border-line bg-elevated px-4 py-3 text-center font-mono text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-[3px] focus:ring-brand/15";

export default function SetupTwoFactorPage() {
  const router = useRouter();
  const { completeStaffLogin } = useSession();
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pendingStaff, setPendingStaff] = useState<StaffApiUser | null>(null);
  const [pendingTokens, setPendingTokens] = useState<{ access: string; refresh: string } | null>(null);

  useEffect(() => {
    const preAuthToken = readPreAuthToken();
    if (!preAuthToken) {
      router.replace("/admin/login");
      return;
    }
    const cached = isRecoverSetupRoute() ? readRecoverSetup() : null;
    if (cached?.qrCodeDataUrl) {
      setSetup(cached);
      return;
    }
    void api<SetupPayload>("/api/admin/auth/2fa/setup/", {
      method: "POST",
      body: JSON.stringify({ preAuthToken }),
    })
      .then(setSetup)
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const preAuthToken = readPreAuthToken();
    const normalized = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        access: string;
        refresh: string;
        user: StaffApiUser;
        backupCodes?: string[];
        mustChangePassword?: boolean;
      }>("/api/admin/auth/2fa/confirm/", {
        method: "POST",
        body: JSON.stringify({ preAuthToken, code: normalized }),
      });
      clearRecoverSetup();
      if (data.backupCodes?.length) {
        setPendingStaff(data.user);
        setPendingTokens({ access: data.access, refresh: data.refresh });
        setBackupCodes(data.backupCodes);
        return;
      }
      clearPreAuthToken();
      const staff = completeStaffLogin(data.access, data.refresh, data.user);
      router.replace(staff.mustChangePassword ? "/admin/change-password" : firstAllowedPath(staff));
    } catch (err) {
      if (err instanceof ApiError && err.code === "totp_locked") {
        clearPreAuthToken();
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not confirm setup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-8 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-lg">
        {backupCodes ? (
          <BackupCodesPanel
            codes={backupCodes}
            onContinue={() => {
              clearPreAuthToken();
              if (!pendingStaff || !pendingTokens) {
                router.replace("/admin/login");
                return;
              }
              const staff = completeStaffLogin(pendingTokens.access, pendingTokens.refresh, pendingStaff);
              router.replace(staff.mustChangePassword ? "/admin/change-password" : firstAllowedPath(staff));
            }}
          />
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink">Set up two-factor authentication</h1>
            <p className="mt-2 text-[13px] text-muted">
              Scan this QR code in Google Authenticator (or any TOTP app), then enter the 6-digit code.
            </p>
            {setup?.qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={setup.qrCodeDataUrl}
                alt="Authenticator QR code"
                className="mx-auto my-4 h-48 w-48 rounded-xl border border-line bg-white p-2"
              />
            ) : (
              <p className="my-6 text-center text-sm text-muted">Loading QR code…</p>
            )}
            {setup?.secret ? (
              <p className="mb-3 break-all text-center font-mono text-[12px] text-ink">{setup.secret}</p>
            ) : null}
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className={`${inputClass} text-lg tracking-[0.3em]`}
                required
              />
              {error ? <p className="text-center text-[12px] text-red">{error}</p> : null}
              <button
                disabled={busy}
                className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Confirming…" : "Confirm and sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
