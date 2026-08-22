"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, inputClass } from "./ui";
import {
  createProviderLedgerEntry,
  createProviderPlan,
  deleteProviderPlan,
  listProviderLedger,
  listProviderPlans,
  patchProviderPlan,
  type ProviderLedgerEntry,
  type ProviderPlan,
} from "@/lib/staff-api";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";

const KINDS = [
  { value: "refund", label: "Refund" },
  { value: "promotion", label: "Listing promotion" },
  { value: "plan", label: "Plan / yojana" },
  { value: "other", label: "Other" },
] as const;

export function ProviderPlansPanel() {
  const { toast } = useAdmin();
  const [plans, setPlans] = useState<ProviderPlan[]>([]);
  const [name, setName] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPlans(await listProviderPlans());
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load plans.");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    if (!name.trim() || !priceLabel.trim()) {
      toast("Plan name and price label are required.");
      return;
    }
    setBusy(true);
    try {
      await createProviderPlan({
        name: name.trim(),
        price_label: priceLabel.trim(),
        description: description.trim(),
      });
      setName("");
      setPriceLabel("");
      setDescription("");
      toast("Plan added.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <h2 className="text-[13px] font-semibold text-ink">Service provider yojana (plans)</h2>
      <p className="mt-1 text-[12px] text-muted">
        Fee labels for ID cards and records. Money does not flow through the app — offline collection only.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Plan name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Basic seller" />
        </Field>
        <Field label="Fee label">
          <input className={inputClass} value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} placeholder="Rs. 5,000/year" />
        </Field>
        <Field label="Note">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
        </Field>
      </div>
      <div className="mt-3">
        <Btn onClick={() => void onAdd()} loading={busy} loadingLabel="Adding…">
          Add plan
        </Btn>
      </div>
      <div className="mt-4 space-y-2">
        {plans.map((plan) => (
          <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-elevated px-3 py-2">
            <div>
              <p className="font-medium text-ink">{plan.name}</p>
              <p className="text-[12px] text-muted">{plan.price_label}{plan.description ? ` · ${plan.description}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <Btn
                kind="ghost"
                onClick={() =>
                  void patchProviderPlan(plan.id, { is_active: !plan.is_active }).then(() => load()).catch((e) =>
                    toast(e instanceof Error ? e.message : "Update failed."),
                  )
                }
              >
                {plan.is_active ? "Deactivate" : "Activate"}
              </Btn>
              <Btn
                kind="danger"
                onClick={() =>
                  void deleteProviderPlan(plan.id)
                    .then(() => {
                      toast("Plan deleted.");
                      return load();
                    })
                    .catch((e) => toast(e instanceof Error ? e.message : "Delete failed."))
                }
              >
                Delete
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProviderLedgerPanel() {
  const { toast } = useAdmin();
  const [rows, setRows] = useState<ProviderLedgerEntry[]>([]);
  const [providerId, setProviderId] = useState("");
  const [kind, setKind] = useState<ProviderLedgerEntry["kind"]>("refund");
  const [title, setTitle] = useState("");
  const [amountLabel, setAmountLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listProviderLedger());
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load ledger.");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    if (!providerId.trim() || !title.trim()) {
      toast("Provider ID and title are required.");
      return;
    }
    setBusy(true);
    try {
      await createProviderLedgerEntry({
        provider_id: providerId.trim(),
        kind,
        title: title.trim(),
        amount_label: amountLabel.trim(),
        note: note.trim(),
      });
      setTitle("");
      setAmountLabel("");
      setNote("");
      toast("Record added on system.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <h2 className="text-[13px] font-semibold text-ink">Provider refund & reporting (on-system)</h2>
      <p className="mt-1 text-[12px] text-muted">
        Manual refund, promotion, and plan notes for service providers. No payment gateway — reporting only.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Provider user ID">
          <input
            className={inputClass}
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="UUID from user drawer"
          />
        </Field>
        <label className="block text-[12px] font-semibold text-ink">
          Type
          <select className={`${inputClass} mt-1`} value={kind} onChange={(e) => setKind(e.target.value as ProviderLedgerEntry["kind"])}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Boost refund" />
        </Field>
        <Field label="Amount label">
          <input className={inputClass} value={amountLabel} onChange={(e) => setAmountLabel(e.target.value)} placeholder="Rs. 500" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Note">
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional admin note" />
          </Field>
        </div>
      </div>
      <div className="mt-3">
        <Btn onClick={() => void onAdd()} loading={busy} loadingLabel="Saving…">
          Add record
        </Btn>
      </div>
      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-line bg-elevated px-3 py-2 text-[12px]">
            <p className="font-medium text-ink">{row.title} · {row.kind}</p>
            <p className="text-muted">
              {row.provider_name || row.provider_id} · {row.amount_label || "—"} · {formatNptDateTime(row.created_at)}
            </p>
            {row.note ? <p className="mt-1 text-muted">{row.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
