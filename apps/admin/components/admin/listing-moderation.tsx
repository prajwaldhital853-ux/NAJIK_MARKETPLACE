"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge } from "@/components/admin/ui";
import { formatNptDateTime, formatNptTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import { deleteStaffListing, fetchStaffImage, listStaffListings, patchStaffListing, type StaffListing } from "@/lib/staff-api";

const TABS = ["Pending", "All", "Approved", "Rejected"] as const;

export function ListingModeration({
  title,
  crumb,
  summary,
  defaultTab = "Pending",
  category,
}: {
  title: string;
  crumb: string;
  summary: string;
  defaultTab?: (typeof TABS)[number];
  category?: string;
}) {
  const { apiSession } = useSession();
  const params = useSearchParams();
  const statusParam = params.get("status");
  const initialTab = TABS.includes((statusParam || "").replace(/^\w/, (c) => c.toUpperCase()) as (typeof TABS)[number])
    ? ((statusParam || "").replace(/^\w/, (c) => c.toUpperCase()) as (typeof TABS)[number])
    : defaultTab;
  const [items, setItems] = useState<StaffListing[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function load() {
    if (!apiSession) return;
    try {
      setItems(await listStaffListings(category ? { category } : undefined));
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load listings.");
    }
  }

  useEffect(() => {
    if (!apiSession) {
      setItems([]);
      setError("Sign in with a staff account to review live listings.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), ADMIN_POLL_MS);
    return () => window.clearInterval(id);
  }, [apiSession, category]);

  async function setStatus(id: string, status: "approved" | "rejected") {
    try {
      await patchStaffListing(id, status, reason[id]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update listing.");
    }
  }

  async function removeListing(id: string) {
    if (!window.confirm("Delete this listing permanently? Buyers will no longer see it.")) return;
    try {
      await deleteStaffListing(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete listing.");
    }
  }

  const pending = items.filter((i) => i.status === "pending" || i.has_pending_edit);
  const visible = useMemo(() => {
    const filtered =
      tab === "All"
        ? items
        : tab === "Pending"
          ? items.filter((i) => i.status === "pending" || i.has_pending_edit)
          : items.filter((i) => i.status === tab.toLowerCase());
    return [...filtered].sort((a, b) => {
      if ((a.status === "pending" || a.has_pending_edit) && !(b.status === "pending" || b.has_pending_edit)) return -1;
      if ((b.status === "pending" || b.has_pending_edit) && !(a.status === "pending" || a.has_pending_edit)) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, tab]);

  return (
    <div>
      <PageHeader
        title={title}
        crumb={crumb}
        summary={summary}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
              Refresh
            </button>
            <Link href="/admin/providers" className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
              Seller KYC
            </Link>
          </div>
        }
      />
      <SummaryStrip
        items={[
          { label: "Listings", value: items.length, tone: "brand" },
          { label: "Pending / edits", value: pending.length, tone: "amber" },
          { label: "Approved", value: items.filter((i) => i.status === "approved").length, tone: "green" },
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
              className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === item ? "bg-brand text-white" : "border border-line text-ink"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {updatedAt ? <p className="text-[11px] text-muted">Updated {formatNptTime(updatedAt.toISOString())}</p> : null}
      </div>
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {visible.length === 0 && !error ? (
        <section className="card-glow rounded-2xl border border-line bg-card p-6 text-sm text-muted">
          {items.length === 0 ? "No seller listings yet." : `No ${tab.toLowerCase()} listings.`}
        </section>
      ) : null}
      <div className="max-h-[min(70vh,calc(100vh-16rem))] space-y-4 overflow-y-auto pr-1">
        {visible.map((item) => (
          <ListingCard
            key={item.id}
            item={item}
            reason={reason[item.id] || ""}
            onReason={(value) => setReason((current) => ({ ...current, [item.id]: value }))}
            onStatus={setStatus}
            onDelete={removeListing}
          />
        ))}
      </div>
    </div>
  );
}

function ListingCard({
  item,
  reason,
  onReason,
  onStatus,
  onDelete,
}: {
  item: StaffListing;
  reason: string;
  onReason: (value: string) => void;
  onStatus: (id: string, status: "approved" | "rejected") => void;
  onDelete: (id: string) => void;
}) {
  const extras = item.extras || {};
  const deal = String(extras.dealType || item.subcategory || item.category);
  return (
    <section className="card-glow rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium text-ink">{item.title}</p>
          <p className="text-sm text-muted">
            {item.category} · {deal} · {item.subcategory} · {item.owner_name}
          </p>
        </div>
        <StatusBadge status={item.has_pending_edit ? "edit pending" : item.status} />
      </div>
      <p className="mt-2 text-sm text-ink">{item.description}</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Info label="Category" value={item.category} />
        <Info label="Price" value={`Rs. ${item.price}${item.negotiable ? " (negotiable)" : ""}`} />
        <Info label="Location" value={item.location} />
        <Info label="Contact" value={item.contact_phone} />
        <Info label="Reach via" value={item.contact_via} />
        {extras.company ? <Info label="Company" value={String(extras.company)} /> : null}
        {extras.experience ? <Info label="Experience" value={String(extras.experience)} /> : null}
        {extras.make ? <Info label="Vehicle" value={`${extras.make} ${extras.model || ""}`.trim()} /> : null}
        {extras.year ? <Info label="Year" value={String(extras.year)} /> : null}
        {extras.rateType ? <Info label="Rate type" value={String(extras.rateType)} /> : null}
        {extras.condition ? <Info label="Condition" value={String(extras.condition)} /> : null}
        <Info label="Promote requested" value={item.promote_requested ? "Yes" : "No"} />
        <Info label="Submitted" value={formatNptDateTime(item.created_at)} />
        <Info label="Views" value={String(item.view_count || 0)} />
        <Info label="Comments" value={String(item.comment_count || 0)} />
        <Info label="Reviews" value={String(item.review_count || 0)} />
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {item.photos.map((photo) => (
          <StaffPhoto key={photo.id} src={photo.url} />
        ))}
      </div>
      {item.has_pending_edit && item.pending_edit ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-ink">Edit request</p>
          <p className="mt-1 text-muted">Proposed title: {String(item.pending_edit.title || item.title)}</p>
          <p className="mt-1 text-ink">{String(item.pending_edit.description || "")}</p>
          <p className="mt-1 text-muted">Proposed price: Rs. {String(item.pending_edit.price || item.price)}</p>
        </div>
      ) : null}
      {item.admin_reason ? <p className="mt-3 text-sm text-red">Last reason: {item.admin_reason}</p> : null}
      {item.status === "pending" || item.has_pending_edit ? (
        <div className="mt-4 space-y-2">
          <textarea
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="Rejection reason (required to reject)"
            className="w-full rounded-xl border border-line bg-elevated px-3 py-2 text-sm"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => onStatus(item.id, "approved")}>{item.has_pending_edit ? "Approve edit" : "Approve"}</Btn>
            <Btn kind="danger" onClick={() => onStatus(item.id, "rejected")}>
              {item.has_pending_edit ? "Reject edit" : "Reject"}
            </Btn>
            <Btn kind="danger" onClick={() => onDelete(item.id)}>
              Delete listing
            </Btn>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <Btn kind="danger" onClick={() => onDelete(item.id)}>
            Delete listing
          </Btn>
        </div>
      )}
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

function StaffPhoto({ src }: { src: string }) {
  const [blobUrl, setBlobUrl] = useState("");
  useEffect(() => {
    let objectUrl = "";
    void fetchStaffImage(src).then((url) => {
      objectUrl = url;
      setBlobUrl(url);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  if (!blobUrl) return <div className="h-32 rounded-xl bg-elevated" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={blobUrl} alt="" className="h-32 w-full rounded-xl object-cover" />
  );
}
