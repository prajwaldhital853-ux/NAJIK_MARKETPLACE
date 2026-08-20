"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge, inputClass } from "@/components/admin/ui";
import { formatNptDate, formatNptDateTime, formatNptTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import {
  fetchStaffImage,
  listProviderApplications,
  patchProviderApplication,
  type ProviderApplication,
} from "@/lib/staff-api";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
] as const;

type StatusFilter = (typeof TABS)[number]["value"];

function displayStatus(status: string) {
  if (status === "verified") return "active";
  return status;
}

function statusFromParams(raw: string | null): StatusFilter {
  if (raw === "all" || raw === "active" || raw === "rejected") return raw;
  return "pending";
}

export default function ProviderVerificationPage() {
  const { apiSession } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = statusFromParams(params.get("status"));
  const [items, setItems] = useState<ProviderApplication[]>([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    if (!apiSession) return;
    try {
      setItems(await listProviderApplications());
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load applications.");
    }
  }

  useEffect(() => {
    if (!apiSession) {
      setItems([]);
      setError("Sign in with a staff account to review live seller applications.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), ADMIN_POLL_MS);
    return () => window.clearInterval(id);
  }, [apiSession]);

  function setFilter(next: StatusFilter) {
    router.replace(next === "pending" ? `${pathname}?status=pending` : `${pathname}?status=${next}`);
  }

  useEffect(() => {
    if (!params.get("status")) {
      router.replace(`${pathname}?status=pending`);
    }
  }, [params, pathname, router]);

  async function setStatus(id: string, status: "pending" | "verified" | "rejected", rejection_note?: string) {
    try {
      await patchProviderApplication(id, status, rejection_note);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  const pending = items.filter((i) => i.status === "pending" || i.has_pending_edit);
  const active = items.filter((i) => i.status === "verified" && !i.has_pending_edit);
  const rejected = items.filter((i) => i.status === "rejected" && !i.has_pending_edit);

  const visible = useMemo(() => {
    const filtered =
      filter === "pending"
        ? items.filter((i) => i.status === "pending" || i.has_pending_edit)
        : filter === "active"
          ? items.filter((i) => i.status === "verified" && !i.has_pending_edit)
          : filter === "rejected"
            ? items.filter((i) => i.status === "rejected" && !i.has_pending_edit)
            : items;
    return [...filtered].sort((a, b) => {
      const aQueue = a.status === "pending" || Boolean(a.has_pending_edit);
      const bQueue = b.status === "pending" || Boolean(b.has_pending_edit);
      if (aQueue && !bQueue) return -1;
      if (bQueue && !aQueue) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, filter]);

  return (
    <div>
      <PageHeader
        title="KYC / Verification"
        crumb="Dashboard / KYC / Seller applications"
        summary="Review service provider KYC. Pending needs a decision. Active means verified. Rejected providers see your note and can resubmit from the app."
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
          { label: "Applications", value: items.length, tone: "brand" },
          { label: "Pending", value: pending.length, tone: "amber" },
          { label: "Active", value: active.length, tone: "green" },
          { label: "Rejected", value: rejected.length, tone: "red" },
        ]}
      />
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
        {updatedAt ? (
          <p className="text-[11px] text-muted">Updated {formatNptTime(updatedAt.toISOString())}</p>
        ) : null}
      </div>
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {visible.length === 0 && !error ? (
        <section className="card-glow rounded-2xl border border-line bg-card p-6 text-sm text-muted">
          {items.length === 0
            ? "No seller applications yet. When a service provider verifies OTP and submits KYC, their details and documents appear here automatically."
            : `No ${filter} applications.`}
        </section>
      ) : null}
      <div className="max-h-[min(70vh,calc(100vh-16rem))] space-y-4 overflow-y-auto pr-1">
        {visible.map((item) => (
          <ApplicationCard key={item.id} item={item} onStatus={setStatus} />
        ))}
      </div>
    </div>
  );
}

function ApplicationCard({
  item,
  onStatus,
}: {
  item: ProviderApplication;
  onStatus: (id: string, status: "pending" | "verified" | "rejected", rejection_note?: string) => void;
}) {
  const [rejectNote, setRejectNote] = useState(item.rejection_note || "");
  const profileRows = Object.entries(item.profile_data || {}).filter(([, value]) => String(value || "").trim());

  function reject() {
    const note = rejectNote.trim();
    if (!note) {
      window.alert("Add a rejection note so the provider knows what to fix.");
      return;
    }
    onStatus(item.id, "rejected", note);
  }

  return (
    <section className="card-glow rounded-2xl border border-line bg-card p-5 text-ink">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium text-ink">{item.full_name}</p>
          <p className="text-sm text-muted">{item.service_type}</p>
          {item.has_pending_edit ? <p className="mt-1 text-xs font-semibold text-amber">Profile edit waiting</p> : null}
        </div>
        <StatusBadge status={displayStatus(item.status)} />
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-line bg-elevated px-3 py-2 text-sm sm:grid-cols-2">
        <Info label="Submitted date" value={formatNptDate(item.created_at)} />
        <Info label="Submitted time" value={`${formatNptTime(item.created_at)} NPT`} />
        <p className="text-[12px] text-muted sm:col-span-2">{formatNptDateTime(item.created_at)}</p>
        {item.reviewed_at ? (
          <p className="text-[12px] text-muted sm:col-span-2">Reviewed {formatNptDateTime(item.reviewed_at)}</p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Info label="Full name" value={item.full_name} />
        <Info label="Service type" value={item.service_type} />
        <Info label="Address" value={item.address} />
        <Info label="Secondary contact" value={item.contact || "—"} />
        <Info label="Phone" value={item.phone} />
        <Info label="Email" value={item.email} />
        <Info label="Account phone" value={item.owner_phone || "—"} />
        <Info label="Account email" value={item.owner_email || "—"} />
        <Info label="Phone verified" value={item.phone_verified ? "Yes" : "No"} />
        <Info label="Email verified" value={item.email_verified ? "Yes" : "No"} />
      </dl>

      {profileRows.length ? (
        <div className="mt-4 rounded-xl border border-line bg-elevated px-3 py-3">
          <p className="text-sm font-semibold text-ink">Registration details</p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            {profileRows.map(([key, value]) => (
              <Info key={key} label={key.replaceAll("_", " ")} value={String(value)} />
            ))}
          </dl>
        </div>
      ) : null}

      {item.rejection_note ? (
        <div className="mt-4 rounded-xl border border-red/35 bg-red-soft px-3 py-3 text-sm">
          <p className="font-semibold text-red">Rejection note shown to user</p>
          <p className="mt-1 whitespace-pre-wrap text-ink">{item.rejection_note}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <DocPreview label="Live photo" src={item.photo_uri} />
        <DocPreview label="Citizenship front" src={item.nagrita_uri} />
        <DocPreview label="Citizenship back" src={item.nagrita_back_uri} />
        <DocPreview label="Nation card" src={item.nation_card_uri} />
        <DocPreview label="Other document" src={item.other_document_uri} />
      </div>

      {item.has_pending_edit ? (
        <div className="mt-4 rounded-xl border border-amber/35 bg-amber-soft px-3 py-3 text-sm">
          <p className="font-semibold text-amber">Proposed changes</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {item.pending_edit?.full_name ? <Info label="New name" value={item.pending_edit.full_name} /> : null}
            {item.pending_edit?.address ? <Info label="New address" value={item.pending_edit.address} /> : null}
            {item.pending_edit?.contact ? <Info label="New contact" value={item.pending_edit.contact} /> : null}
            {item.pending_edit?.service_type ? <Info label="New service type" value={item.pending_edit.service_type} /> : null}
          </dl>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <DocPreview label="New photo" src={item.pending_photo_uri} />
            <DocPreview label="New nagrita front" src={item.pending_nagrita_uri} />
            <DocPreview label="New nagrita back" src={item.pending_nagrita_back_uri} />
          </div>
            <div className="mt-3 flex flex-wrap gap-2">
            <Btn onClick={() => onStatus(item.id, "verified")}>Approve edit</Btn>
            <Btn kind="danger" onClick={() => onStatus(item.id, "rejected")}>
              Reject edit only
            </Btn>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.owner_id ? (
          <a
            href={`/admin/id-cards?owner=${item.owner_id}`}
            className="rounded px-2.5 py-1.5 text-[12px] font-medium border border-line bg-elevated text-ink"
          >
            See user ID card
          </a>
        ) : null}
      </div>

      {item.status === "pending" ? (
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-semibold text-ink">Rejection note for the provider</label>
          <textarea
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            placeholder="Explain what is wrong (blurry citizenship, wrong nation card, name mismatch…)"
            className={`${inputClass} min-h-[5rem]`}
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => onStatus(item.id, "verified")}>Verify (set Active)</Btn>
            <Btn kind="danger" onClick={reject}>
              Reject with note
            </Btn>
          </div>
        </div>
      ) : item.status === "verified" ? (
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-semibold text-ink">Revoke active KYC</label>
          <p className="text-[12px] text-muted">
            Use this when documents must be updated or extra papers are required. The provider sees this note and can
            resubmit from Profile.
          </p>
          <textarea
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            placeholder="Why is this KYC being revoked? (e.g. need clearer citizenship back, add nation card…)"
            className={`${inputClass} min-h-[5rem]`}
            rows={3}
          />
          <Btn kind="danger" onClick={reject}>
            Reject KYC with note
          </Btn>
        </div>
      ) : item.status === "rejected" ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Btn onClick={() => onStatus(item.id, "pending")}>Reactivate to pending</Btn>
          <Btn onClick={() => onStatus(item.id, "verified")}>Set Active</Btn>
        </div>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src?: string }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    let objectUrl = "";
    void fetchStaffImage(src).then((url) => {
      objectUrl = url;
      if (alive) setBlobUrl(url);
      else if (url) URL.revokeObjectURL(url);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return (
    <>
      <figure className="overflow-hidden rounded-xl border border-line bg-elevated">
        <figcaption className="px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">{label}</figcaption>
        {blobUrl ? (
          <button type="button" onClick={() => setOpen(true)} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blobUrl} alt={label} className="h-48 w-full object-cover" />
          </button>
        ) : (
          <p className="px-3 pb-3 text-sm text-muted">{src ? "Loading…" : "Not uploaded"}</p>
        )}
      </figure>
      {open && blobUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blobUrl} alt={label} className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      ) : null}
    </>
  );
}
