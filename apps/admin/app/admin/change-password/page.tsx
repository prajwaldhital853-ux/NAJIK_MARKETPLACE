"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Btn, Field, inputClass } from "@/components/admin/ui";
import { changeOwnPassword, checkPasswordStrength, type PasswordStrength } from "@/lib/staff-api";
import { useSession } from "@/lib/session";

function StrengthList({ strength }: { strength: PasswordStrength | null }) {
  if (!strength) return null;
  const rows = [
    ["At least 8 characters", strength.length],
    ["1 uppercase letter", strength.uppercase],
    ["1 lowercase letter", strength.lowercase],
    ["1 number", strength.number],
    ["1 special character (@$!%*?&)", strength.special],
  ] as const;
  return (
    <div className="mt-2 space-y-1 rounded border border-line bg-elevated/50 p-2 text-[11px]">
      {rows.map(([label, ok]) => (
        <p key={label} className={ok ? "text-green" : "text-muted"}>
          {ok ? "✓" : "○"} {label}
        </p>
      ))}
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { staff, ready, logout, refreshStaff } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!staff) {
      router.replace("/admin/login");
      return;
    }
    if (!staff.mustChangePassword) {
      router.replace("/admin");
    }
  }, [ready, staff, router]);

  async function onPasswordInput(value: string) {
    setNewPassword(value);
    if (value.length < 3) {
      setStrength(null);
      return;
    }
    try {
      setStrength(await checkPasswordStrength(value));
    } catch {
      setStrength(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await changeOwnPassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      await refreshStaff();
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !staff?.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded border border-line bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
            <KeyRound size={18} />
          </span>
          <div>
            <h1 className="text-[18px] font-semibold text-ink">Set a new password</h1>
            <p className="text-[12px] text-muted">
              First login for <strong>{staff.email}</strong> — choose your own password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="New password">
            <div className="relative">
              <input
                className={`${inputClass} pr-9`}
                type={show ? "text" : "password"}
                value={newPassword}
                onChange={(e) => void onPasswordInput(e.target.value)}
                required
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShow((v) => !v)}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <StrengthList strength={strength} />
          </Field>
          <Field label="Confirm new password">
            <input
              className={inputClass}
              type={show ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-[12px] text-red">{error}</p> : null}
          <div className="flex gap-2">
            <Btn type="submit" loading={busy} disabled={!strength?.valid || newPassword !== confirmPassword}>
              Save password & continue
            </Btn>
            <Btn kind="ghost" onClick={logout}>
              Sign out
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
