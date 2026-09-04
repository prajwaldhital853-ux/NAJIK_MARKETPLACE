"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, inputClass } from "./ui";
import { AdminLoadingState } from "./page-frame";
import { ADMIN_POLL_FALLBACK_MS } from "@/lib/event-stream";
import {
  approveStaffLoadRequest,
  fetchStaffImage,
  getSellerPaymentConfig,
  getStaffSellerWalletDetail,
  listAppUsers,
  listStaffLoadRequests,
  listStaffSellerWallets,
  patchSellerPaymentConfig,
  rejectStaffLoadRequest,
  staffAdjustSellerWallet,
  type AppDirectoryUser,
  type SellerLoadRequestRow,
  type SellerPaymentConfig,
  type SellerWalletRow,
} from "@/lib/staff-api";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { toastAdminError } from "@/lib/rbac";
import { ReadOnlyBanner, useRbacGuard } from "@/lib/use-page-rbac";

async function fileToDataUri(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:${file.type || "image/png"};base64,${btoa(binary)}`;
}

function listingsFromAmount(amountRupees: number, feeRupees: number) {
  if (!feeRupees || feeRupees <= 0) return null;
  return Math.floor(amountRupees / feeRupees);
}

function ProofLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] max-w-3xl rounded-xl border border-line bg-card p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-[13px] font-semibold text-ink">Payment screenshot</p>
          <Btn kind="ghost" onClick={onClose}>Close</Btn>
        </div>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Payment proof" className="max-h-[75vh] w-full rounded-lg object-contain" />
        ) : (
          <p className="p-8 text-center text-sm text-muted">Could not load image.</p>
        )}
      </div>
    </div>
  );
}

function parseBandMaxRupees(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (!text || text === "unlimited" || text === "above") return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function SellerPaymentsConfigPanel({
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
  const [cfg, setCfg] = useState<SellerPaymentConfig | null>(null);
  const [fee, setFee] = useState("10");
  const [feeLabel, setFeeLabel] = useState("Rs. 10");
  const [tiers, setTiers] = useState<{ min_rupees: string; max_rupees: string; fee_rupees: string }[]>([]);
  const [minLoad, setMinLoad] = useState("100");
  const [maxLoad, setMaxLoad] = useState("50000");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [instructions, setInstructions] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const isBuyer = audience === "user";

  useEffect(() => {
    void getSellerPaymentConfig(audience)
      .then((c) => {
        setCfg(c);
        setFee(String(c.listing_fee_rupees));
        setFeeLabel(c.listing_fee_label);
        setTiers(
          (c.listing_fee_tiers || []).length
            ? c.listing_fee_tiers!.map((row) => ({
                min_rupees: String(row.min_rupees ?? 0),
                max_rupees: row.max_rupees == null ? "" : String(row.max_rupees),
                fee_rupees: String(row.fee_rupees ?? 0),
              }))
            : [],
        );
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
  }, [toast, audience]);

  async function save(qrFile?: File | null) {
    if (!guardUpdate()) return;
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
      if (!isBuyer) {
        payload.listing_fee_tiers = tiers
          .map((row) => ({
            min_rupees: Number(row.min_rupees) || 0,
            max_rupees: parseBandMaxRupees(row.max_rupees),
            fee_rupees: Number(row.fee_rupees) || 0,
          }))
          .filter((row) => !(row.min_rupees === 0 && row.max_rupees == null && row.fee_rupees === 0));
      }
      if (qrFile) payload.qr_code_uri = await fileToDataUri(qrFile);
      const next = await patchSellerPaymentConfig(payload, audience);
      setCfg(next);
      toast(isBuyer ? "Buyer payment settings saved." : "Seller payment settings saved.");
      onChanged?.();
    } catch (err) {
      toastAdminError(toast, err, "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${embedded ? "mt-0" : "mt-4"} rounded border border-line bg-card p-4`}>
      <h2 className="text-[13px] font-semibold text-ink">{isBuyer ? "Buyer wallet payments" : "Seller listing payments"}</h2>
      <p className="mt-1 text-[12px] text-muted">
        {isBuyer
          ? "Set the buyer wallet fee and bank details for offline top-ups. Price bands apply to seller listings only."
          : "Listing post fee is based on the seller's ad price. Add bands below (example: Rs. 0–1,000 → Rs. 20; Rs. 1,001–20,000 → Rs. 100). Leave max blank for “and above”. Default fee is used only if no band matches."}
      </p>
      {readOnly ? <div className="mt-3"><ReadOnlyBanner label="Seller Payments" /></div> : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label={isBuyer ? "Buyer wallet fee (Rs.)" : "Default listing fee (Rs.)"}>
          <input className={inputClass} value={fee} onChange={(e) => setFee(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label={isBuyer ? "Fee label" : "Default fee label"}>
          <input className={inputClass} value={feeLabel} onChange={(e) => setFeeLabel(e.target.value)} disabled={readOnly} />
        </Field>
        {!isBuyer ? (
        <div className="md:col-span-2 rounded-lg border border-line p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-ink">Price bands (ad price → post fee)</p>
            {!readOnly ? (
              <Btn
                kind="ghost"
                onClick={() =>
                  setTiers((rows) => [...rows, { min_rupees: "", max_rupees: "", fee_rupees: "" }])
                }
              >
                Add band
              </Btn>
            ) : null}
          </div>
          <div className="grid gap-2">
            {!tiers.length ? (
              <p className="text-[12px] text-muted">No price bands yet. Click Add band, or only the default listing fee above will apply.</p>
            ) : null}
            {tiers.map((row, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 md:grid-cols-7">
                <Field label={index === 0 ? "Min Rs." : ""}>
                  <input
                    className={inputClass}
                    value={row.min_rupees}
                    placeholder="0"
                    disabled={readOnly}
                    onChange={(e) =>
                      setTiers((rows) => rows.map((item, i) => (i === index ? { ...item, min_rupees: e.target.value } : item)))
                    }
                  />
                </Field>
                <Field label={index === 0 ? "Max Rs. (blank = above)" : ""}>
                  <input
                    className={inputClass}
                    value={row.max_rupees}
                    placeholder="unlimited"
                    disabled={readOnly}
                    onChange={(e) =>
                      setTiers((rows) => rows.map((item, i) => (i === index ? { ...item, max_rupees: e.target.value } : item)))
                    }
                  />
                </Field>
                <Field label={index === 0 ? "Fee Rs." : ""}>
                  <input
                    className={inputClass}
                    value={row.fee_rupees}
                    placeholder="20"
                    disabled={readOnly}
                    onChange={(e) =>
                      setTiers((rows) => rows.map((item, i) => (i === index ? { ...item, fee_rupees: e.target.value } : item)))
                    }
                  />
                </Field>
                <div className="flex items-end pb-1 md:col-span-1">
                  {!readOnly && tiers.length > 1 ? (
                    <Btn kind="ghost" onClick={() => setTiers((rows) => rows.filter((_, i) => i !== index))}>
                      Remove
                    </Btn>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : null}
        <Field label="Min load (Rs.)">
          <input className={inputClass} value={minLoad} onChange={(e) => setMinLoad(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Max load (Rs.)">
          <input className={inputClass} value={maxLoad} onChange={(e) => setMaxLoad(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Bank name">
          <input className={inputClass} value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Account name">
          <input className={inputClass} value={accountName} onChange={(e) => setAccountName(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Account number">
          <input className={inputClass} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Branch">
          <input className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)} disabled={readOnly} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Payment instructions">
            <textarea className={inputClass} rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} disabled={readOnly} />
          </Field>
        </div>
        <Field label="Payment QR image">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={inputClass}
            disabled={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              void save(e.target.files?.[0] || null);
            }}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink md:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={readOnly} />
          Payments active
        </label>
      </div>
      {cfg?.qr_code_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cfg.qr_code_url} alt="Payment QR" className="mt-3 h-32 w-32 rounded-lg border border-line object-contain" />
      ) : null}
      <div className="mt-3">
        {!readOnly ? (
          <Btn onClick={() => void save()} loading={busy} loadingLabel="Saving…">
            Save payment settings
          </Btn>
        ) : null}
      </div>
    </section>
  );
}

export function SellerLoadRequestsPanel({
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
  const [rows, setRows] = useState<SellerLoadRequestRow[]>([]);
  const [feeRupees, setFeeRupees] = useState(10);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [proofSrc, setProofSrc] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [pending, cfg] = await Promise.all([listStaffLoadRequests("pending", audience), getSellerPaymentConfig(audience)]);
      setRows(pending);
      setFeeRupees(cfg.listing_fee_rupees || 0);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      if (opts?.refresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [toast, audience]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load({ refresh: true }), ADMIN_POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [load]);

  async function openProof(row: SellerLoadRequestRow) {
    if (!row.proof_url) return;
    setProofLoading(true);
    try {
      const src = await fetchStaffImage(row.proof_url);
      setProofSrc(src || "");
    } finally {
      setProofLoading(false);
    }
  }

  async function approve(id: string) {
    if (!guardUpdate()) return;
    setBusyId(id);
    try {
      await approveStaffLoadRequest(id);
      toast("Load approved and credited.");
      await load();
      onChanged?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!guardUpdate()) return;
    setBusyId(id);
    try {
      await rejectStaffLoadRequest(id, rejectNote[id] || "");
      toast("Load request rejected.");
      await load();
      onChanged?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={`${embedded ? "mt-0" : "mt-4"} rounded-xl border border-line bg-card p-0 overflow-hidden`}>
      <div className="bg-gradient-to-r from-brand/15 via-brand-soft to-card px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Add-fund queue</h2>
            <p className="mt-1 text-[12px] text-muted">
              Sellers paid offline and tapped “I have paid”. Approve to credit wallet · fee Rs. {feeRupees}/listing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber/20 px-3 py-1 text-[11px] font-bold text-ink">{rows.length} pending</span>
            <Btn kind="ghost" loading={refreshing} loadingLabel="Refreshing…" disabled={refreshing} onClick={() => void load({ refresh: true })}>
              Refresh
            </Btn>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {loading ? <AdminLoadingState label="Loading payment requests…" /> : null}
        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-elevated px-4 py-10 text-center">
            <p className="text-sm font-semibold text-ink">No pending requests</p>
            <p className="mt-1 text-[12px] text-muted">New bank top-ups appear here automatically.</p>
          </div>
        ) : null}

        {!loading
          ? rows.map((row) => {
          const rupees = row.amount_paisa / 100;
          const listings = listingsFromAmount(rupees, feeRupees);
          return (
            <div key={row.id} className="rounded-xl border border-line bg-elevated p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[16px] font-bold text-ink">{row.amount_label}</p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">{row.provider_name}</p>
                  <p className="text-[11px] text-muted">
                    {row.provider_phone} · ref {row.payment_reference || "—"} · {formatNptDateTime(row.created_at)}
                  </p>
                  {listings != null ? (
                    <p className="mt-2 inline-block rounded-lg bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                      ≈ {listings} live listing{listings === 1 ? "" : "s"} at Rs. {feeRupees} each
                    </p>
                  ) : null}
                </div>
                {row.proof_url ? (
                  <Btn kind="ghost" onClick={() => void openProof(row)} loading={proofLoading} loadingLabel="Loading…">
                    View screenshot
                  </Btn>
                ) : (
                  <span className="text-[11px] text-muted">No screenshot</span>
                )}
              </div>

              {!readOnly ? (
                <>
                  <Field label="Rejection note (if rejecting)">
                    <input
                      className={inputClass}
                      value={rejectNote[row.id] || ""}
                      onChange={(e) => setRejectNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="e.g. Amount not received"
                    />
                  </Field>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn onClick={() => void approve(row.id)} loading={busyId === row.id} loadingLabel="Approving…">
                      Approve & credit
                    </Btn>
                    <Btn kind="danger" onClick={() => void reject(row.id)} loading={busyId === row.id} loadingLabel="Rejecting…">
                      Reject
                    </Btn>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[11px] text-muted">View-only — you cannot approve or reject load requests.</p>
              )}
            </div>
          );
        })
          : null}
      </div>

      {proofSrc !== null ? <ProofLightbox src={proofSrc} onClose={() => setProofSrc(null)} /> : null}
    </section>
  );
}

export function SellerWalletsPanel({
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
  const [rows, setRows] = useState<SellerWalletRow[]>([]);
  const [providers, setProviders] = useState<AppDirectoryUser[]>([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [providerId, setProviderId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addedLabel, setAddedLabel] = useState("Rs. 0");
  const [deductedLabel, setDeductedLabel] = useState("Rs. 0");

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      listStaffSellerWallets(undefined, audience).then(setRows),
      listAppUsers().then((users) =>
        setProviders(
          users.filter((u) => u.account_type === (audience === "user" ? "user" : "provider")),
        ),
      ),
    ])
      .catch((err) => toast(err instanceof Error ? err.message : "Could not load wallets."))
      .finally(() => setLoading(false));
  }, [toast, audience]);

  const filteredProviders = providers.filter((p) => {
    const q = sellerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.phone || "").includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  async function loadDetail(id: string) {
    if (!id) {
      setAddedLabel("Rs. 0");
      setDeductedLabel("Rs. 0");
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await getStaffSellerWalletDetail(id, audience);
      let added = 0;
      let deducted = 0;
      for (const tx of detail.transactions) {
        if (tx.amount_paisa > 0) added += tx.amount_paisa;
        else deducted += Math.abs(tx.amount_paisa);
      }
      const fmt = (paisa: number) => `Rs. ${Math.round(paisa / 100).toLocaleString("en-IN")}`;
      setAddedLabel(fmt(added));
      setDeductedLabel(fmt(deducted));
    } catch {
      setAddedLabel("—");
      setDeductedLabel("—");
    } finally {
      setDetailLoading(false);
    }
  }

  function pickSeller(user: AppDirectoryUser) {
    setProviderId(user.id);
    setSellerSearch(`${user.full_name} · ${user.phone || user.email || user.id}`);
    void loadDetail(user.id);
  }

  async function adjust() {
    if (!guardUpdate()) return;
    if (!providerId.trim()) {
      toast("Choose a seller first.");
      return;
    }
    setBusy(true);
    try {
      await staffAdjustSellerWallet(providerId.trim(), Number(adjustAmount), adjustNote.trim(), audience);
      toast("Balance adjusted.");
      setAdjustAmount("");
      setAdjustNote("");
      setRows(await listStaffSellerWallets(undefined, audience));
      await loadDetail(providerId.trim());
      onChanged?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Adjust failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${embedded ? "mt-0" : "mt-4"} rounded-xl border border-line bg-card p-4`}>
      <h2 className="text-[15px] font-bold text-ink">Seller wallets</h2>
      <p className="mt-1 text-[12px] text-muted">Search seller, view totals credited vs deducted, manual balance fixes.</p>

      {loading ? <div className="mt-4"><AdminLoadingState label="Loading wallets…" /></div> : null}

      {!loading ? (
      <>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Find seller (name, phone, email)">
          <input
            className={inputClass}
            value={sellerSearch}
            onChange={(e) => {
              setSellerSearch(e.target.value);
              if (!e.target.value.trim()) setProviderId("");
            }}
            placeholder="Type to search…"
          />
        </Field>
        <Field label="Provider user ID">
          <input className={inputClass} value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="Auto-filled when you pick below" />
        </Field>
      </div>

      {sellerSearch.trim() && filteredProviders.length ? (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-line bg-elevated">
          {filteredProviders.slice(0, 12).map((user) => (
            <button
              key={user.id}
              type="button"
              className="block w-full border-b border-line px-3 py-2 text-left text-[12px] hover:bg-card last:border-0"
              onClick={() => pickSeller(user)}
            >
              <span className="font-semibold text-ink">{user.full_name}</span>
              <span className="text-muted"> · {user.phone || "—"} · {user.email || "—"}</span>
            </button>
          ))}
        </div>
      ) : null}

      {providerId ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted">Total added</p>
            <p className="text-[15px] font-bold text-brand">{detailLoading ? "…" : addedLabel}</p>
          </div>
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted">Total deducted</p>
            <p className="text-[15px] font-bold text-red">{detailLoading ? "…" : deductedLabel}</p>
          </div>
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted">Current balance</p>
            <p className="text-[15px] font-bold text-ink">
              {rows.find((r) => r.provider_id === providerId)?.balance_label ?? "—"}
            </p>
          </div>
        </div>
      ) : null}

      {!readOnly ? (
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Adjust (+/- Rs.)">
          <input className={inputClass} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="500 or -100" />
        </Field>
        <Field label="Note">
          <input className={inputClass} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason" />
        </Field>
      </div>
      ) : null}
      <div className="mt-3">
        {!readOnly ? (
          <Btn onClick={() => void adjust()} loading={busy} loadingLabel="Saving…">
            Apply adjustment
          </Btn>
        ) : (
          <ReadOnlyBanner label="Seller Payments" />
        )}
      </div>
      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <button
            key={row.provider_id}
            type="button"
            className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-left text-[12px] hover:border-brand"
            onClick={() => pickSeller({ id: row.provider_id, full_name: row.provider_name, phone: row.provider_phone, email: null, account_type: "provider", phone_verified: false, email_verified: false, verification_status: "none", date_joined: "", is_active: true })}
          >
            <p className="font-medium text-ink">{row.provider_name} · {row.balance_label}</p>
            <p className="text-muted">{row.provider_phone} · {row.provider_id}</p>
          </button>
        ))}
      </div>
      </>
      ) : null}
    </section>
  );
}
