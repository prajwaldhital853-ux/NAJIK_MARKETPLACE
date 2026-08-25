"use client";

import { useEffect, useState } from "react";
import { Btn, Field, inputClass } from "./ui";
import {
  getReferEarnConfig,
  listStaffReferrals,
  patchReferEarnConfig,
  type ReferEarnConfig,
  type StaffReferralRow,
} from "@/lib/staff-api";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { toastAdminError } from "@/lib/rbac";
import { ReadOnlyBanner, useRbacGuard } from "@/lib/use-page-rbac";

export function ReferEarnAdminPanel({
  embedded,
  onChanged,
  audience = "provider",
}: {
  embedded?: boolean;
  onChanged?: () => void;
  audience?: "provider" | "user";
}) {
  const { toast } = useAdmin();
  const { readOnly, guardUpdate } = useRbacGuard("seller_payments");
  const [cfg, setCfg] = useState<ReferEarnConfig | null>(null);
  const [rows, setRows] = useState<StaffReferralRow[]>([]);
  const [rewardAmount, setRewardAmount] = useState("200");
  const [rewardLabel, setRewardLabel] = useState("Rs. 200");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const config = await getReferEarnConfig(audience);
        setCfg(config);
        setRewardAmount(String(config.reward_amount));
        setRewardLabel(config.reward_label);
        setDescription(config.description);
        setActive(config.is_active);
        setRows(await listStaffReferrals(undefined, audience));
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not load Refer & Earn.");
      }
    })();
  }, [toast, audience]);

  async function save() {
    if (!guardUpdate()) return;
    setBusy(true);
    try {
      const next = await patchReferEarnConfig({
        reward_amount: Number(rewardAmount) || 0,
        reward_label: rewardLabel.trim(),
        description: description.trim(),
        is_active: active,
      }, audience);
      setCfg(next);
      toast("Refer & Earn settings saved.");
      onChanged?.();
    } catch (err) {
      toastAdminError(toast, err, "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${embedded ? "mt-0" : "mt-4"} rounded border border-line bg-card p-4`}>
      <h2 className="text-[13px] font-semibold text-ink">{audience === "user" ? "Buyer Refer & Earn" : "Seller Refer & Earn"}</h2>
      <p className="mt-1 text-[12px] text-muted">
        {audience === "user"
          ? "Buyers share a code; you earn on-system when friends join and verify their phone. No in-app payment."
          : "Service providers share a code; you earn on-system when friends join and post their first live listing. No in-app payment."}
      </p>
      {readOnly ? <div className="mt-3"><ReadOnlyBanner label="Refer & Earn" /></div> : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Reward amount (Rs.)">
          <input className={inputClass} value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Reward label">
          <input className={inputClass} value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} disabled={readOnly} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink md:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={readOnly} />
          Program active
        </label>
      </div>
      <div className="mt-3">
        {!readOnly ? (
          <Btn onClick={() => void save()} loading={busy} loadingLabel="Saving…">
            Save Refer & Earn
          </Btn>
        ) : null}
      </div>
      {cfg ? (
        <p className="mt-2 text-[11px] text-muted">
          Current reward: {cfg.reward_label} · {cfg.is_active ? "Active" : "Paused"}
        </p>
      ) : null}
      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-line bg-elevated px-3 py-2 text-[12px]">
            <p className="font-medium text-ink">
              {row.referrer_name} → {row.referred_name}
            </p>
            <p className="text-muted">
              {row.invite_code} · {row.status === "earned" ? "Earned" : "Pending"} ·{" "}
              {row.status === "earned" ? `Rs. ${row.reward_amount} credited` : `Rs. ${row.reward_amount} when they post`} ·{" "}
              {formatNptDateTime(row.joined_at)}
            </p>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-muted">No referrals yet.</p> : null}
      </div>
    </section>
  );
}
