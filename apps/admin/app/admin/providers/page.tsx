"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { DataTable, type Column, type RowMenuAction } from "@/components/admin/table";
import { DetailKv, DetailOverlay } from "@/components/admin/detail-overlay";
import { Avatar, Btn, StatusBadge, inputClass } from "@/components/admin/ui";
import { formatNptDateTime, formatNptTime, relativeTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import {
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
  const [open, setOpen] = useState<ProviderApplication | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const orderKey = "najik-kyc-order";
  const [orderIds, setOrderIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(orderKey) || "[]") as string[];
    } catch {
      return [];
    }
  });

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
    router.replace(next === "pending" ? `${pathname}?status=pending` : `${pathname}?status=${next}`, { scroll: false });
  }

  useEffect(() => {
    if (!params.get("status")) {
      router.replace(`${pathname}?status=pending`);
    }
  }, [params, pathname, router]);

  useEffect(() => {
    setOpen((prev) => (prev ? items.find((i) => i.id === prev.id) || prev : prev));
  }, [items]);

  useEffect(() => {
    if (!open) {
      setRejectNote("");
      return;
    }
    setRejectNote(open.rejection_note || "");
  }, [open?.id]);

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
    const rank = new Map(orderIds.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER / 2;
      const bi = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER / 2;
      if (ai !== bi) return ai - bi;
      const aQueue = a.status === "pending" || Boolean(a.has_pending_edit);
      const bQueue = b.status === "pending" || Boolean(b.has_pending_edit);
      if (aQueue && !bQueue) return -1;
      if (bQueue && !aQueue) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, filter, orderIds]);

  function moveRow(row: ProviderApplication, direction: -1 | 1) {
    const ids = visible.map((r) => r.id);
    const idx = ids.indexOf(row.id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrderIds(next);
    try {
      localStorage.setItem(orderKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const columns: Column<ProviderApplication>[] = [
    {
      key: "full_name",
      label: "Applicant",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.full_name} id={row.id} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.full_name}</p>
            <p className="truncate text-xs text-muted">{row.email || row.phone}</p>
          </div>
        </div>
      ),
    },
    { key: "service_type", label: "Service", render: (row) => row.service_type || "—" },
    {
      key: "address",
      label: "Address",
      render: (row) => <span className="line-clamp-2 max-w-[240px] text-xs">{row.address || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={displayStatus(row.status)} />
          {row.has_pending_edit ? <StatusBadge status="edit pending" /> : null}
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Submitted",
      render: (row) => <span className="text-xs text-muted">{relativeTime(row.created_at)}</span>,
      sortValue: (row) => new Date(row.created_at).getTime(),
    },
  ];

  const rowActions: RowMenuAction<ProviderApplication>[] = [
    {
      label: "Delete",
      danger: true,
      onClick: () => {
        window.alert("KYC applications cannot be hard-deleted. Reject or revoke instead.");
      },
    },
    {
      label: "Block",
      danger: true,
      onClick: (row) => {
        const note = window.prompt("Rejection / block note for the provider:", rejectNote || "Blocked by admin.");
        if (note == null) return;
        if (!note.trim()) {
          window.alert("A note is required.");
          return;
        }
        void setStatus(row.id, "rejected", note.trim());
      },
    },
    { label: "Move up", onClick: (row) => moveRow(row, -1) },
    { label: "Move down", onClick: (row) => moveRow(row, 1) },
  ];

  const profileRows = Object.entries(open?.profile_data || {}).filter(([, value]) => String(value || "").trim());

  function rejectOpen() {
    if (!open) return;
    const note = rejectNote.trim();
    if (!note) {
      window.alert("Add a rejection note so the provider knows what to fix.");
      return;
    }
    void setStatus(open.id, "rejected", note);
  }

  const docs = open
    ? [
        { label: "Live photo", src: open.photo_uri },
        { label: "Citizenship front", src: open.nagrita_uri },
        { label: "Citizenship back", src: open.nagrita_back_uri },
        { label: "Nation card", src: open.nation_card_uri },
        { label: "Other document", src: open.other_document_uri },
        ...(open.has_pending_edit
          ? [
              { label: "New photo", src: open.pending_photo_uri },
              { label: "New nagrita front", src: open.pending_nagrita_uri },
              { label: "New nagrita back", src: open.pending_nagrita_back_uri },
            ]
          : []),
      ].filter((d) => d.src)
    : [];

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
      <div className="mb-3 flex justify-end">
        {updatedAt ? <p className="text-[11px] text-muted">Updated {formatNptTime(updatedAt.toISOString())}</p> : null}
      </div>
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      <DataTable
        rows={visible}
        columns={columns}
        tabs={TABS.map((t) => t.label)}
        tab={TABS.find((t) => t.value === filter)?.label || "Pending"}
        onTab={(label) => {
          const hit = TABS.find((t) => t.label === label);
          if (hit) setFilter(hit.value);
        }}
        onRow={setOpen}
        rowActions={rowActions}
        searchPlaceholder="Filter applications…"
      />

      <DetailOverlay
        open={!!open}
        title={open?.full_name || "KYC application"}
        onClose={() => setOpen(null)}
        details={
          open ? (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={open.full_name} id={open.id} size={44} />
                <div>
                  <p className="font-semibold text-ink">{open.full_name}</p>
                  <StatusBadge status={displayStatus(open.status)} />
                </div>
              </div>
              <DetailKv label="Service type" value={open.service_type} />
              <DetailKv label="Address" value={open.address} />
              <DetailKv label="Phone" value={open.phone} />
              <DetailKv label="Email" value={open.email} />
              <DetailKv label="Secondary contact" value={open.contact || "—"} />
              <DetailKv label="Account phone" value={open.owner_phone || "—"} />
              <DetailKv label="Account email" value={open.owner_email || "—"} />
              <DetailKv label="Phone verified" value={open.phone_verified ? "Yes" : "No"} />
              <DetailKv label="Email verified" value={open.email_verified ? "Yes" : "No"} />
              <DetailKv label="Submitted" value={formatNptDateTime(open.created_at)} />
              {open.reviewed_at ? <DetailKv label="Reviewed" value={formatNptDateTime(open.reviewed_at)} /> : null}
              {profileRows.map(([key, value]) => (
                <DetailKv key={key} label={key.replaceAll("_", " ")} value={String(value)} />
              ))}
              {open.rejection_note ? (
                <div className="mt-3 rounded-xl border border-red/35 bg-red-soft px-3 py-3 text-sm">
                  <p className="font-semibold text-red">Rejection note</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink">{open.rejection_note}</p>
                </div>
              ) : null}
              {open.has_pending_edit ? (
                <div className="mt-3 rounded-xl border border-amber/35 bg-amber-soft px-3 py-3 text-sm">
                  <p className="font-semibold text-amber">Proposed changes</p>
                  {open.pending_edit?.full_name ? <DetailKv label="New name" value={open.pending_edit.full_name} /> : null}
                  {open.pending_edit?.address ? <DetailKv label="New address" value={open.pending_edit.address} /> : null}
                  {open.pending_edit?.service_type ? (
                    <DetailKv label="New service type" value={open.pending_edit.service_type} />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null
        }
        documents={docs}
        footer={
          open ? (
            <div className="space-y-2">
              {open.owner_id ? (
                <a href={`/admin/id-cards?owner=${open.owner_id}`} className="inline-block text-xs font-semibold text-brand">
                  See user ID card →
                </a>
              ) : null}
              {open.has_pending_edit ? (
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => void setStatus(open.id, "verified")}>Approve edit</Btn>
                  <Btn kind="danger" onClick={() => void setStatus(open.id, "rejected")}>
                    Reject edit only
                  </Btn>
                </div>
              ) : null}
              {open.status === "pending" ? (
                <>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Explain what is wrong…"
                    className={`${inputClass} min-h-[4.5rem]`}
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Btn onClick={() => void setStatus(open.id, "verified")}>Verify (set Active)</Btn>
                    <Btn kind="danger" onClick={rejectOpen}>
                      Reject with note
                    </Btn>
                  </div>
                </>
              ) : null}
              {open.status === "verified" && !open.has_pending_edit ? (
                <>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Why is this KYC being revoked?"
                    className={`${inputClass} min-h-[4.5rem]`}
                    rows={3}
                  />
                  <Btn kind="danger" onClick={rejectOpen}>
                    Reject KYC with note
                  </Btn>
                </>
              ) : null}
              {open.status === "rejected" ? (
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => void setStatus(open.id, "pending")}>Reactivate to pending</Btn>
                  <Btn onClick={() => void setStatus(open.id, "verified")}>Set Active</Btn>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  );
}
