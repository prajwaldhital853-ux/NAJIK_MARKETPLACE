"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackupCodesPanel } from "@/components/admin/backup-codes-panel";
import { api, ApiError } from "@/lib/api";
import { firstAllowedPath } from "@/lib/rbac";
import { mapApiStaff, type StaffApiUser } from "@/lib/staff-api";
import { saveStaffTokens } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { clearRecoverSetup, isRecoverSetupRoute, readRecoverSetup } from "@/lib/twoFactorRecovery";
import { clearPreAuthToken, readPreAuthToken } from "@/lib/twoFactorSession";

type SetupPayload = { qrCodeDataUrl?: string; secret?: string };

export default function SetupTwoFactorPage() {
  const router = useRouter();
  const { refreshStaff } = useSession();
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pendingStaff, setPendingStaff] = useState<StaffApiUser | null>(null);

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
      saveStaffTokens(data.access, data.refresh);
      if (data.backupCodes?.length) {
        setPendingStaff(data.user);
        setBackupCodes(data.backupCodes);
        return;
      }
      clearPreAuthToken();
      const staff = mapApiStaff(data.user);
      router.replace(staff.mustChangePassword ? "/admin/change-password" : firstAllowedPath(staff));
      await refreshStaff();
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
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        {backupCodes ? (
          <BackupCodesPanel
            codes={backupCodes}
            onContinue={() => {
              clearPreAuthToken();
              if (!pendingStaff) {
                router.replace("/admin");
                return;
              }
              const staff = mapApiStaff(pendingStaff);
              router.replace(staff.mustChangePassword ? "/admin/change-password" : firstAllowedPath(staff));
            }}
          />
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#111827]">Set up two-factor authentication</h1>
            <p className="mt-2 text-[13px] text-[#6b7280]">
              Scan this QR code in Google Authenticator (or any TOTP app), then enter the 6-digit code.
            </p>
            {setup?.qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={setup.qrCodeDataUrl} alt="Authenticator QR code" className="mx-auto my-4 h-48 w-48" />
            ) : (
              <p className="my-6 text-center text-sm text-[#6b7280]">Loading QR code…</p>
            )}
            {setup?.secret ? <p className="mb-3 break-all text-center font-mono text-[12px] text-[#374151]">{setup.secret}</p> : null}
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full rounded-full border border-[#d7ddd9] px-4 py-3 text-center font-mono text-lg tracking-[0.3em]"
                required
              />
              {error ? <p className="text-center text-[12px] text-[#c62828]">{error}</p> : null}
              <button disabled={busy} className="w-full rounded-full bg-[#1B7D2C] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Confirming…" : "Confirm and sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
