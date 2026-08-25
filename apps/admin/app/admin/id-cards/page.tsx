"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StaffIdCardVisual } from "@/components/admin/staff-id-card-visual";
import { PageHeader, SummaryStrip, AdminLoadingState } from "@/components/admin/page-frame";
import { Btn, Field, StatusBadge, inputClass } from "@/components/admin/ui";
import { formatNptDateTime, formatNptTime } from "@/lib/format";
import { ADMIN_POLL_FALLBACK_MS } from "@/lib/event-stream";
import { useSession } from "@/lib/session";
import { useAdmin } from "@/lib/store";
import { toastAdminError } from "@/lib/rbac";
import { ReadOnlyBanner, usePageRbac, useRbacGuard } from "@/lib/use-page-rbac";
import {
  fetchBranding,
  fetchStaffImage,
  listProviderIdCards,
  patchProviderIdCard,
  updateBranding,
  type ProviderIdCard,
} from "@/lib/staff-api";

async function fileToDataUri(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:${file.type || "image/png"};base64,${btoa(binary)}`;
}

const TABS = [
  { value: "requested", label: "Requests" },
  { value: "approved", label: "Approved" },
  { value: "blocked", label: "Blocked" },
  { value: "all", label: "All" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function tabFromParams(raw: string | null): Tab {
  if (raw === "requested" || raw === "approved" || raw === "blocked") return raw;
  return "all";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

export default function IdCardsPage() {
  const { apiSession } = useSession();
  const { toast } = useAdmin();
  const { readOnly, canUpdate, guardUpdate } = useRbacGuard("kyc_verification");
  const settingsRbac = usePageRbac("settings");
  const canEditBranding = canUpdate || settingsRbac.canUpdate;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = tabFromParams(params.get("status"));
  const [items, setItems] = useState<ProviderIdCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const ownerAutoOpened = useRef<string | null>(null);
  const closedIntentionally = useRef(false);
  const [signatoryPreview, setSignatoryPreview] = useState("/id-card/authorized-signatory.png");
  const [emergencyPhone, setEmergencyPhone] = useState("01-5970123");
  const [emergencyEmail, setEmergencyEmail] = useState("support@najik.com");
  const [website, setWebsite] = useState("www.najik.com");
  const [brandBusy, setBrandBusy] = useState(false);

  async function loadBranding() {
    if (!apiSession) return;
    try {
      const data = await fetchBranding();
      setEmergencyPhone(data.emergency_phone || "01-5970123");
      setEmergencyEmail(data.emergency_email || "support@najik.com");
      setWebsite(data.website || "www.najik.com");
      if (data.signatory_uri) {
        const blob = await fetchStaffImage(`${data.signatory_uri}?t=${Date.now()}`);
        setSignatoryPreview(blob || `${data.signatory_uri}?t=${Date.now()}`);
      }
    } catch {
      /* keep defaults */
    }
  }

  async function load() {
    if (!apiSession) return;
    setLoading(true);
    try {
      const rows = await listProviderIdCards();
      setItems(rows);
      setUpdatedAt(new Date());
      setError("");
      const ownerParam = params.get("owner");
      if (
        ownerParam &&
        !params.get("id") &&
        !closedIntentionally.current &&
        ownerAutoOpened.current !== ownerParam
      ) {
        const match = rows.find((row) => row.owner_id === ownerParam);
        if (match) {
          ownerAutoOpened.current = ownerParam;
          setSelectedId(match.id);
        }
      }
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load ID cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!apiSession) {
      setItems([]);
      setLoading(false);
      setError("Sign in with a staff account to manage seller ID cards.");
      return;
    }
    void load();
    void loadBranding();
    const id = window.setInterval(() => void load(), ADMIN_POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [apiSession]);

  async function onSignatoryFile(file?: File | null) {
    if (!file || !canEditBranding) return;
    setBrandBusy(true);
    try {
      const saved = await updateBranding({ signatory_uri: await fileToDataUri(file) });
      if (saved.signatory_uri) {
        const blob = await fetchStaffImage(`${saved.signatory_uri}?t=${Date.now()}`);
        setSignatoryPreview(blob || `${saved.signatory_uri}?t=${Date.now()}`);
      }
      await load();
      toast("Signature updated on all seller ID cards.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not upload signature.");
    } finally {
      setBrandBusy(false);
    }
  }

  async function saveEmergencyContact() {
    if (!canEditBranding) return;
    setBrandBusy(true);
    try {
      await updateBranding({
        emergency_phone: emergencyPhone.trim(),
        emergency_email: emergencyEmail.trim(),
        website: website.trim(),
      });
      await load();
      toast("Emergency contact updated on all seller ID cards.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save emergency contact.");
    } finally {
      setBrandBusy(false);
    }
  }

  useEffect(() => {
    const id = params.get("id");
    if (id) {
      closedIntentionally.current = false;
      setSelectedId(id);
      return;
    }
    if (closedIntentionally.current) {
      setSelectedId(null);
    }
  }, [params]);

  function setFilter(next: Tab) {
    const qs = new URLSearchParams();
    if (next !== "all") qs.set("status", next);
    // Do not keep id/owner in the URL when switching filters — that reopened the modal.
    const suffix = qs.toString();
    closedIntentionally.current = true;
    setSelectedId(null);
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function openCard(id: string) {
    closedIntentionally.current = false;
    setSelectedId(id);
    const qs = new URLSearchParams();
    if (filter !== "all") qs.set("status", filter);
    qs.set("id", id);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  }

  function closeCard() {
    closedIntentionally.current = true;
    setSelectedId(null);
    const qs = new URLSearchParams();
    if (filter !== "all") qs.set("status", filter);
    // Drop id and owner so polling / effects cannot reopen the window.
    const suffix = qs.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  async function act(id: string, action: "approve" | "revoke" | "block" | "unblock") {
    if (!guardUpdate()) return;
    const key = `${id}:${action}`;
    setBusyAction(key);
    try {
      await patchProviderIdCard(id, action === "unblock" ? "approve" : action);
      toast(
        action === "approve" || action === "unblock"
          ? "ID card unblocked / download approved."
          : action === "block"
            ? "ID card blocked."
            : "ID card access revoked.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update card access.");
      toast(err instanceof Error ? err.message : "Could not update card access.");
    } finally {
      setBusyAction(null);
    }
  }

  const actionLabel = (action: "approve" | "revoke" | "block" | "unblock") =>
    action === "approve" || action === "unblock"
      ? "Approving…"
      : action === "block"
        ? "Blocking…"
        : "Revoking…";

  const requested = items.filter((i) => i.access_status === "requested");
  const approved = items.filter((i) => i.access_status === "approved");
  const blocked = items.filter((i) => i.access_status === "blocked");

  const visible = useMemo(() => {
    if (filter === "requested") return requested;
    if (filter === "approved") return approved;
    if (filter === "blocked") return blocked;
    return items;
  }, [filter, items, requested, approved, blocked]);

  const selected = items.find((row) => row.id === selectedId) || null;
  const profileRows = Object.entries(selected?.profile_data || {}).filter(([, value]) => String(value || "").trim());

  return (
    <div>
      <PageHeader
        title="Seller ID cards"
        crumb="Dashboard / KYC / ID cards"
        summary="Open any seller’s ID to review the visual card and full account details before approving download / print."
        extra={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            Refresh
          </button>
        }
      />
      <SummaryStrip
        items={[
          { label: "Cards", value: items.length, tone: "brand" },
          { label: "Requests", value: requested.length, tone: "amber" },
          { label: "Approved", value: approved.length, tone: "green" },
          { label: "Blocked", value: blocked.length, tone: "red" },
        ]}
      />

      {readOnly ? <div className="mb-4"><ReadOnlyBanner label="Seller ID cards" /></div> : null}

      <section className="card-glow mb-4 grid gap-4 rounded-2xl border border-line bg-card p-5 lg:grid-cols-[220px_1fr]">
        <div>
          <h2 className="text-sm font-semibold text-ink">Authorized signatory</h2>
          <p className="mt-1 text-xs text-muted">Shown on every seller ID card front. Changes apply to active cards immediately.</p>
          <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatoryPreview} alt="Authorized signatory" className="max-h-full max-w-full object-contain" />
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={brandBusy || !apiSession || !canEditBranding}
            onChange={(event) => void onSignatoryFile(event.target.files?.[0])}
            className="mt-3 block w-full text-xs text-ink"
          />
          {!canEditBranding ? <p className="mt-2 text-xs text-muted">View-only — branding changes are disabled.</p> : null}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Emergency contact (card back)</h2>
          <p className="mt-1 text-xs text-muted">Updates phone, email, and website on all seller ID card backs.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Phone">
              <input className={inputClass} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} disabled={!canEditBranding} />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={emergencyEmail} onChange={(e) => setEmergencyEmail(e.target.value)} disabled={!canEditBranding} />
            </Field>
            <Field label="Website">
              <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!canEditBranding} />
            </Field>
          </div>
          <div className="mt-3">
            {canEditBranding ? (
            <Btn loading={brandBusy} loadingLabel="Saving…" disabled={brandBusy || !apiSession} onClick={() => void saveEmergencyContact()}>
              Save contact for all cards
            </Btn>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === item.value ? "bg-brand text-white" : "border border-line text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {updatedAt ? <p className="text-[11px] text-muted">Updated {formatNptTime(updatedAt.toISOString())}</p> : null}
      </div>
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {loading ? (
        <AdminLoadingState label="Loading ID cards…" />
      ) : visible.length === 0 && !error ? (
        <section className="card-glow rounded-2xl border border-line bg-card p-6 text-sm text-muted">
          No ID cards in this filter.
        </section>
      ) : null}
      {!loading ? (
      <div className="space-y-3">
        {visible.map((card) => (
          <section key={card.id} className="card-glow rounded-2xl border border-line bg-card p-4 text-ink">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-medium">{card.full_name || card.owner_name}</p>
                <p className="text-sm text-muted">{card.card_code}</p>
                <p className="mt-1 text-xs text-muted">
                  {card.category || "—"} · {card.phone || "—"} · {card.email || "—"}
                </p>
                {card.requested_at ? (
                  <p className="mt-1 text-xs text-amber">Requested {formatNptDateTime(card.requested_at)}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={card.access_status} />
                <StatusBadge status={card.is_verified ? "verified" : card.kyc_status} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn kind="ghost" onClick={() => openCard(card.id)}>
                See user ID card
              </Btn>
              {!readOnly && card.access_status !== "approved" ? (
                <Btn
                  loading={busyAction === `${card.id}:${card.access_status === "blocked" ? "unblock" : "approve"}`}
                  loadingLabel={actionLabel(card.access_status === "blocked" ? "unblock" : "approve")}
                  disabled={!!busyAction}
                  onClick={() => void act(card.id, card.access_status === "blocked" ? "unblock" : "approve")}
                >
                  {card.access_status === "blocked" ? "Unblock ID card" : "Approve download / print"}
                </Btn>
              ) : null}
              {!readOnly && card.access_status === "approved" ? (
                <Btn kind="ghost" loading={busyAction === `${card.id}:revoke`} loadingLabel="Revoking…" disabled={!!busyAction} onClick={() => void act(card.id, "revoke")}>
                  Revoke access
                </Btn>
              ) : null}
              {!readOnly && card.access_status !== "blocked" ? (
                <Btn kind="danger" loading={busyAction === `${card.id}:block`} loadingLabel="Blocking…" disabled={!!busyAction} onClick={() => void act(card.id, "block")}>
                  Block
                </Btn>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 sm:p-6">
          <div className="my-4 w-full max-w-5xl rounded-2xl border border-line bg-card p-4 text-ink shadow-xl sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{selected.full_name || selected.owner_name}</p>
                <p className="text-sm text-muted">{selected.card_code}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={selected.access_status} />
                  <StatusBadge status={selected.is_verified ? "verified" : selected.kyc_status} />
                </div>
              </div>
              <Btn kind="ghost" onClick={closeCard}>
                Close
              </Btn>
            </div>

            <p className="mb-3 text-sm font-semibold text-ink">Visual ID card</p>
            <StaffIdCardVisual card={selected} />

            <div className="mt-5 rounded-2xl border border-line bg-elevated p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Complete seller details</p>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Full name" value={selected.full_name || selected.owner_name} />
                <Info label="Provider ID" value={selected.card_code} />
                <Info label="Category / service" value={selected.category || "—"} />
                <Info label="Phone" value={selected.phone || "—"} />
                <Info label="Email" value={selected.email || "—"} />
                <Info label="Address" value={selected.address || "—"} />
                <Info label="Secondary contact" value={selected.contact || "—"} />
                <Info label="Account phone" value={selected.owner_phone || "—"} />
                <Info label="Account email" value={selected.owner_email || "—"} />
                <Info label="Phone verified" value={selected.phone_verified ? "Yes" : "No"} />
                <Info label="Email verified" value={selected.email_verified ? "Yes" : "No"} />
                <Info label="Account status" value={selected.account_status || "—"} />
                <Info label="KYC status" value={selected.kyc_status || "—"} />
                <Info label="Download access" value={selected.access_status} />
                <Info
                  label="Requested at"
                  value={selected.requested_at ? formatNptDateTime(selected.requested_at) : "—"}
                />
                <Info
                  label="Approved at"
                  value={selected.approved_at ? formatNptDateTime(selected.approved_at) : "—"}
                />
                <Info
                  label="Joined on"
                  value={selected.joined_on ? formatNptDateTime(selected.joined_on) : "—"}
                />
                <Info label="Application ID" value={selected.application_id || "—"} />
                <Info label="Owner user ID" value={selected.owner_id} />
                <Info label="Verify URL" value={selected.verify_url} />
              </dl>

              {profileRows.length ? (
                <div className="mt-4 rounded-xl border border-line bg-card px-3 py-3">
                  <p className="text-sm font-semibold text-ink">Registration profile data</p>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    {profileRows.map(([key, value]) => (
                      <Info key={key} label={key.replaceAll("_", " ")} value={String(value)} />
                    ))}
                  </dl>
                </div>
              ) : null}

              {selected.rejection_note ? (
                <div className="mt-4 rounded-xl border border-red/35 bg-red-soft px-3 py-3 text-sm">
                  <p className="font-semibold text-red">KYC rejection note</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink">{selected.rejection_note}</p>
                </div>
              ) : null}

              {selected.staff_note ? (
                <div className="mt-4 rounded-xl border border-line bg-card px-3 py-3 text-sm">
                  <p className="font-semibold text-ink">Staff note</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{selected.staff_note}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!readOnly && selected.access_status !== "approved" ? (
                <Btn
                  loading={busyAction === `${selected.id}:${selected.access_status === "blocked" ? "unblock" : "approve"}`}
                  loadingLabel={actionLabel(selected.access_status === "blocked" ? "unblock" : "approve")}
                  disabled={!!busyAction}
                  onClick={() => void act(selected.id, selected.access_status === "blocked" ? "unblock" : "approve")}
                >
                  {selected.access_status === "blocked" ? "Unblock ID card" : "Approve download / print"}
                </Btn>
              ) : null}
              {!readOnly && selected.access_status === "approved" ? (
                <Btn kind="ghost" loading={busyAction === `${selected.id}:revoke`} loadingLabel="Revoking…" disabled={!!busyAction} onClick={() => void act(selected.id, "revoke")}>
                  Revoke access
                </Btn>
              ) : null}
              {!readOnly && selected.access_status !== "blocked" ? (
                <Btn kind="danger" loading={busyAction === `${selected.id}:block`} loadingLabel="Blocking…" disabled={!!busyAction} onClick={() => void act(selected.id, "block")}>
                  Block card
                </Btn>
              ) : null}
              {readOnly ? <p className="text-xs text-muted">View-only — card moderation is disabled.</p> : null}
              <Btn kind="ghost" onClick={closeCard}>
                Close
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
