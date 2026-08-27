"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, inputClass } from "@/components/admin/ui";
import { toastAdminError } from "@/lib/rbac";
import { useRbacGuard } from "@/lib/use-page-rbac";
import {
  applyRetentionPolicies,
  getPrivacyRetentionConfig,
  patchPrivacyRetentionConfig,
  type PrivacyRetentionConfig,
} from "@/lib/staff-api";

function numField(
  label: string,
  value: number,
  onChange: (v: number) => void,
  disabled: boolean,
) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        className={inputClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </Field>
  );
}

export function PrivacyRetentionPanel() {
  const { readOnly, canUpdate, guardUpdate } = useRbacGuard("app_control");
  const [config, setConfig] = useState<PrivacyRetentionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await getPrivacyRetentionConfig());
      setError("");
    } catch (err) {
      setConfig(null);
      setError(err instanceof Error ? err.message : "Could not load privacy settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!config || !guardUpdate()) return;
    setSaving(true);
    try {
      const saved = await patchPrivacyRetentionConfig(config);
      setConfig(saved);
    } catch (err) {
      toastAdminError(() => undefined, err, "Could not save privacy settings.");
    } finally {
      setSaving(false);
    }
  }

  async function runRetention(purgeInactive: boolean) {
    if (!guardUpdate()) return;
    const msg = purgeInactive
      ? "Run retention purge AND delete old deactivated accounts?"
      : "Run retention purge on logs, OTP rows, and old chat messages?";
    if (!window.confirm(msg)) return;
    setApplying(true);
    try {
      const res = await applyRetentionPolicies(purgeInactive);
      alert(`Retention job complete:\n${JSON.stringify(res.stats, null, 2)}`);
      await load();
    } catch (err) {
      toastAdminError(() => undefined, err, "Retention job failed.");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading privacy & retention…</p>;
  }

  if (!config) {
    return <p className="text-sm text-red">{error || "Privacy settings unavailable."}</p>;
  }

  const set = (patch: Partial<PrivacyRetentionConfig>) => setConfig({ ...config, ...patch });

  return (
    <section className="rounded border border-line bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {numField("Inactive account retention (days)", config.inactive_account_retention_days, (v) => set({ inactive_account_retention_days: v }), readOnly)}
        {numField("KYC policy retention (days)", config.kyc_retention_days_after_deletion, (v) => set({ kyc_retention_days_after_deletion: v }), readOnly)}
        {numField("Chat message retention (days)", config.chat_message_retention_days, (v) => set({ chat_message_retention_days: v }), readOnly)}
        {numField("Login lockout log retention", config.login_lockout_retention_days, (v) => set({ login_lockout_retention_days: v }), readOnly)}
        {numField("Staff login attempt retention", config.staff_login_attempt_retention_days, (v) => set({ staff_login_attempt_retention_days: v }), readOnly)}
        {numField("OTP row retention", config.otp_retention_days, (v) => set({ otp_retention_days: v }), readOnly)}
        {numField("Password reset token retention", config.password_reset_token_retention_days, (v) => set({ password_reset_token_retention_days: v }), readOnly)}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.allow_self_service_export} disabled={readOnly} onChange={(e) => set({ allow_self_service_export: e.target.checked })} />
          Allow users to export their data in the app
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.allow_self_service_delete} disabled={readOnly} onChange={(e) => set({ allow_self_service_delete: e.target.checked })} />
          Allow users to delete their account in the app
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.require_password_for_self_delete} disabled={readOnly} onChange={(e) => set({ require_password_for_self_delete: e.target.checked })} />
          Require password to confirm self-delete
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.anonymize_complaint_snapshots_on_delete} disabled={readOnly} onChange={(e) => set({ anonymize_complaint_snapshots_on_delete: e.target.checked })} />
          Anonymize complaint snapshots when account is deleted
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">Public retention summary (shown in app API)</span>
        <textarea
          className={`${inputClass} min-h-[88px]`}
          value={config.retention_policy_summary}
          disabled={readOnly}
          onChange={(e) => set({ retention_policy_summary: e.target.value })}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {canUpdate ? (
          <>
            <Btn kind="primary" loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
              Save retention settings
            </Btn>
            <Btn kind="ghost" loading={applying} loadingLabel="Running…" onClick={() => void runRetention(false)}>
              Run retention purge
            </Btn>
            <Btn kind="danger" loading={applying} disabled={applying} onClick={() => void runRetention(true)}>
              Purge + delete old deactivated accounts
            </Btn>
          </>
        ) : null}
        <Btn kind="ghost" onClick={() => void load()}>
          Refresh
        </Btn>
      </div>

      {config.recent_requests?.length ? (
        <div className="mt-6">
          <h3 className="text-[12px] font-semibold text-ink">Recent export / delete / purge log</h3>
          <div className="mt-2 overflow-x-auto rounded border border-line">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="bg-elevated text-muted">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">User</th>
                </tr>
              </thead>
              <tbody>
                {config.recent_requests.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.action}</td>
                    <td className="px-3 py-2">{row.source}</td>
                    <td className="px-3 py-2">{row.user_email || row.user_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
