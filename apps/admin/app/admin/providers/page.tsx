"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge } from "@/components/admin/ui";
import { formatNptDate, formatNptDateTime, formatNptTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import {
  fetchStaffImage,
  listProviderApplications,
  patchProviderApplication,
  type ProviderApplication,
} from "@/lib/staff-api";

const TABS = ["Pending", "All", "Verified", "Rejected"] as const;

export default function ProviderVerificationPage() {
  const { apiSession } = useSession();
  const [items, setItems] = useState<ProviderApplication[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
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

  async function setStatus(id: string, status: "verified" | "rejected") {
    try {
      await patchProviderApplication(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  const pending = items.filter((i) => i.status === "pending" || i.has_pending_edit);
  const visible = useMemo(() => {
    const filtered =
      tab === "All"
        ? items
        : tab === "Pending"
          ? items.filter((i) => i.status === "pending" || i.has_pending_edit)
          : items.filter((i) => i.status === tab.toLowerCase() && !i.has_pending_edit);
    return [...filtered].sort((a, b) => {
      const aQueue = a.status === "pending" || Boolean(a.has_pending_edit);
      const bQueue = b.status === "pending" || Boolean(b.has_pending_edit);
      if (aQueue && !bQueue) return -1;
      if (bQueue && !aQueue) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, tab]);

  return (
    <div>
      <PageHeader
        title="Seller applications"
        crumb="Dashboard / KYC / Provider queue"
        summary="Every service provider who submits KYC from the NAJIK app lands here. Verified sellers who edit name, address, nagrita, or photo also appear on Pending until you approve or reject the edit. Live profile stays unchanged until you approve."
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
              Refresh
            </button>
            <Link href="/admin/kyc" className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
              User KYC
            </Link>
          </div>
        }
      />
      <SummaryStrip
        items={[
          { label: "Applications", value: items.length, tone: "brand" },
          { label: "Pending", value: pending.length, tone: "amber" },
          { label: "Verified", value: items.filter((i) => i.status === "verified").length, tone: "green" },
          { label: "Rejected", value: items.filter((i) => i.status === "rejected").length, tone: "red" },
        ]}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tab === item ? "bg-brand text-white" : "border border-line text-ink"
              }`}
            >
              {item}
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
            ? "No seller applications yet. When a service provider verifies OTP and submits the apply form, their details and documents appear here automatically."
            : `No ${tab.toLowerCase()} applications.`}
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
  onStatus: (id: string, status: "verified" | "rejected") => void;
}) {
  return (
    <section className="card-glow rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium text-ink">{item.full_name}</p>
          <p className="text-sm text-muted">{item.service_type}</p>
          {item.has_pending_edit ? <p className="mt-1 text-xs font-semibold text-amber-700">Profile edit waiting</p> : null}
        </div>
        <StatusBadge status={item.status} />
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

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <DocPreview label="Photo" src={item.photo_uri} />
        <DocPreview label="Nagrita front" src={item.nagrita_uri} />
        <DocPreview label="Nagrita back" src={item.nagrita_back_uri} />
      </div>

      {item.has_pending_edit ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
          <p className="font-semibold text-ink">Proposed changes</p>
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
        </div>
      ) : null}

      {item.status === "pending" ? (
        <div className="mt-5 flex gap-2">
          <Btn onClick={() => onStatus(item.id, "verified")}>Verify</Btn>
          <Btn kind="danger" onClick={() => onStatus(item.id, "rejected")}>
            Reject
          </Btn>
        </div>
      ) : item.has_pending_edit ? (
        <div className="mt-5 flex gap-2">
          <Btn onClick={() => onStatus(item.id, "verified")}>Approve edit</Btn>
          <Btn kind="danger" onClick={() => onStatus(item.id, "rejected")}>
            Reject edit
          </Btn>
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
