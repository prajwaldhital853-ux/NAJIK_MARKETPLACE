"use client";

import { useEffect, useState } from "react";
import { Btn, Field } from "./ui";
import {
  getReferEarnConfig,
  listStaffReferrals,
  patchReferEarnConfig,
  type ReferEarnConfig,
  type StaffReferralRow,
} from "@/lib/staff-api";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";

export function ReferEarnAdminPanel() {
  const { toast } = useAdmin();
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
        const config = await getReferEarnConfig();
        setCfg(config);
        setRewardAmount(String(config.reward_amount));
        setRewardLabel(config.reward_label);
        setDescription(config.description);
        setActive(config.is_active);
        setRows(await listStaffReferrals());
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not load Refer & Earn.");
      }
    })();
  }, [toast]);

  async function save() {
    setBusy(true);
    try {
      const next = await patchReferEarnConfig({
        reward_amount: Number(rewardAmount) || 0,
        reward_label: rewardLabel.trim(),
        description: description.trim(),
        is_active: active,
      });
      setCfg(next);
      toast("Refer & Earn settings saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <h2 className="text-[13px] font-semibold text-ink">Refer & Earn</h2>
      <p className="mt-1 text-[12px] text-muted">
        Service providers share a code; you earn on-system when friends join and post their first live listing. No in-app payment.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Reward amount (Rs.)" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} />
        <Field label="Reward label" value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} />
        <Field
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="md:col-span-2"
        />
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink md:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Program active
        </label>
      </div>
      <Btn className="mt-3" onClick={() => void save()} loading={busy} loadingLabel="Saving…">
        Save Refer & Earn
      </Btn>
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
              {row.invite_code} · {row.status} · Rs. {row.reward_amount} · {formatNptDateTime(row.joined_at)}
            </p>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-muted">No referrals yet.</p> : null}
      </div>
    </section>
  );
}
