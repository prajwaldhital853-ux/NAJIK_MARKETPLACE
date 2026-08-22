"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, inputClass } from "./ui";
import {
  approveStaffLoadRequest,
  getSellerPaymentConfig,
  listStaffLoadRequests,
  listStaffSellerWallets,
  patchSellerPaymentConfig,
  rejectStaffLoadRequest,
  staffAdjustSellerWallet,
  type SellerLoadRequestRow,
  type SellerPaymentConfig,
  type SellerWalletRow,
} from "@/lib/staff-api";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";

async function fileToDataUri(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:${file.type || "image/png"};base64,${btoa(binary)}`;
}

export function SellerPaymentsConfigPanel() {
  const { toast } = useAdmin();
  const [cfg, setCfg] = useState<SellerPaymentConfig | null>(null);
  const [fee, setFee] = useState("10");
  const [feeLabel, setFeeLabel] = useState("Rs. 10");
  const [minLoad, setMinLoad] = useState("100");
  const [maxLoad, setMaxLoad] = useState("50000");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [instructions, setInstructions] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getSellerPaymentConfig()
      .then((c) => {
        setCfg(c);
        setFee(String(c.listing_fee_rupees));
        setFeeLabel(c.listing_fee_label);
        setMinLoad(String(c.min_load_rupees));
        setMaxLoad(String(c.max_load_rupees));
        setBankName(c.bank_name);
        setAccountName(c.bank_account_name);
        setAccountNumber(c.bank_account_number);
        setBranch(c.bank_branch);
        setInstructions(c.payment_instructions);
        setActive(c.is_active);
      })
      .catch((err) => toast(err instanceof Error ? err.message : "Could not load payment config."));
  }, [toast]);

  async function save(qrFile?: File | null) {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        listing_fee_rupees: Number(fee) || 0,
        listing_fee_label: feeLabel.trim(),
        min_load_rupees: Number(minLoad) || 100,
        max_load_rupees: Number(maxLoad) || 50000,
        bank_name: bankName.trim(),
        bank_account_name: accountName.trim(),
        bank_account_number: accountNumber.trim(),
        bank_branch: branch.trim(),
        payment_instructions: instructions.trim(),
        is_active: active,
      };
      if (qrFile) payload.qr_code_uri = await fileToDataUri(qrFile);
      const next = await patchSellerPaymentConfig(payload);
      setCfg(next);
      toast("Seller payment settings saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <h2 className="text-[13px] font-semibold text-ink">Seller listing payments</h2>
      <p className="mt-1 text-[12px] text-muted">
        Per-listing fee deducted when a seller publishes live. Offline bank top-ups — approve load requests below.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Listing fee (Rs.)">
          <input className={inputClass} value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Field label="Fee label">
          <input className={inputClass} value={feeLabel} onChange={(e) => setFeeLabel(e.target.value)} />
        </Field>
        <Field label="Min load (Rs.)">
          <input className={inputClass} value={minLoad} onChange={(e) => setMinLoad(e.target.value)} />
        </Field>
        <Field label="Max load (Rs.)">
          <input className={inputClass} value={maxLoad} onChange={(e) => setMaxLoad(e.target.value)} />
        </Field>
        <Field label="Bank name">
          <input className={inputClass} value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </Field>
        <Field label="Account name">
          <input className={inputClass} value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </Field>
        <Field label="Account number">
          <input className={inputClass} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </Field>
        <Field label="Branch">
          <input className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Payment instructions">
            <textarea className={inputClass} rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>
        </div>
        <Field label="Payment QR image">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={inputClass}
            onChange={(e) => void save(e.target.files?.[0] || null)}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink md:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Payments active
        </label>
      </div>
      {cfg?.qr_code_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cfg.qr_code_url} alt="Payment QR" className="mt-3 h-32 w-32 rounded-lg border border-line object-contain" />
      ) : null}
      <div className="mt-3">
        <Btn onClick={() => void save()} loading={busy} loadingLabel="Saving…">Save payment settings</Btn>
      </div>
    </section>
  );
}

export function SellerLoadRequestsPanel() {
  const { toast } = useAdmin();
  const [rows, setRows] = useState<SellerLoadRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setRows(await listStaffLoadRequests("pending"));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load requests.");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await approveStaffLoadRequest(id);
      toast("Load approved and credited.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await rejectStaffLoadRequest(id, rejectNote[id] || "");
      toast("Load request rejected.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Add-fund requests</h2>
          <p className="mt-1 text-[12px] text-muted">Sellers who paid offline and clicked “I have paid”.</p>
        </div>
        <Btn kind="ghost" onClick={() => void load()}>Refresh</Btn>
      </div>
      <div className="mt-3 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted">No pending load requests.</p> : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-line bg-elevated p-3">
            <p className="font-medium text-ink">{row.provider_name} · {row.amount_label}</p>
            <p className="text-[11px] text-muted">
              {row.provider_phone} · ref {row.payment_reference || "—"} · {formatNptDateTime(row.created_at)}
            </p>
            {row.proof_url ? (
              <a href={row.proof_url} target="_blank" rel="noreferrer" className="mt-2 text-[12px] text-brand underline">
                View payment screenshot
              </a>
            ) : null}
            <Field label="Rejection note (if rejecting)">
              <input
                className={inputClass}
                value={rejectNote[row.id] || ""}
                onChange={(e) => setRejectNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                placeholder="e.g. Amount not received, fake screenshot"
              />
            </Field>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn onClick={() => void approve(row.id)} loading={busyId === row.id} loadingLabel="Approving…">
                Approve & credit
              </Btn>
              <Btn kind="danger" onClick={() => void reject(row.id)} loading={busyId === row.id} loadingLabel="Rejecting…">
                Reject
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SellerWalletsPanel() {
  const { toast } = useAdmin();
  const [rows, setRows] = useState<SellerWalletRow[]>([]);
  const [providerId, setProviderId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listStaffSellerWallets()
      .then(setRows)
      .catch((err) => toast(err instanceof Error ? err.message : "Could not load wallets."));
  }, [toast]);

  async function adjust() {
    if (!providerId.trim()) {
      toast("Enter provider user ID.");
      return;
    }
    setBusy(true);
    try {
      await staffAdjustSellerWallet(providerId.trim(), Number(adjustAmount), adjustNote.trim());
      toast("Balance adjusted.");
      setAdjustAmount("");
      setAdjustNote("");
      setRows(await listStaffSellerWallets());
    } catch (err) {
      toast(err instanceof Error ? err.message : "Adjust failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <h2 className="text-[13px] font-semibold text-ink">User payments (seller wallets)</h2>
      <p className="mt-1 text-[12px] text-muted">Balances, listing fee deductions, refunds, and manual fixes.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Provider user ID">
          <input className={inputClass} value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="UUID" />
        </Field>
        <Field label="Adjust (+/- Rs.)">
          <input className={inputClass} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="500 or -100" />
        </Field>
        <Field label="Note">
          <input className={inputClass} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason" />
        </Field>
      </div>
      <div className="mt-3">
        <Btn onClick={() => void adjust()} loading={busy} loadingLabel="Saving…">Apply adjustment</Btn>
      </div>
      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.provider_id} className="rounded-lg border border-line bg-elevated px-3 py-2 text-[12px]">
            <p className="font-medium text-ink">{row.provider_name} · {row.balance_label}</p>
            <p className="text-muted">{row.provider_phone} · {row.provider_id}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
