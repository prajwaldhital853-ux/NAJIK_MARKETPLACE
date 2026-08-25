"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { DataTable, type Column, type RowMenuAction } from "@/components/admin/table";
import { DetailKv, DetailOverlay } from "@/components/admin/detail-overlay";
import { Avatar, Btn, StatusBadge, inputClass } from "@/components/admin/ui";
import { formatNptDateTime, formatNptTime, relativeTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ADMIN_POLL_FALLBACK_MS } from "@/lib/event-stream";
import { deleteStaffListing, listStaffListingsPage, patchStaffListing, type StaffListing } from "@/lib/staff-api";
import { usePageRbac } from "@/lib/use-page-rbac";
import { UrgentListingControls } from "./urgent-listing-controls";

const TABS = ["Pending", "All", "Approved", "Rejected", "Deactivated", "Urgent"] as const;

function tabFromParam(raw: string | null): (typeof TABS)[number] {
  if (!raw) return "All";
  const hit = TABS.find((t) => t.toLowerCase() === raw.toLowerCase());
  return hit || "All";
}

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
  const { canUpdate, canDelete, readOnly } = usePageRbac(undefined, category);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openId = params.get("id");
  const autoOpenedId = useRef<string | null>(null);
  const [items, setItems] = useState<StaffListing[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [counts, setCounts] = useState<{
    total: number;
    pending: number;
    approved?: number;
    rejected?: number;
    deactivated?: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>(() => tabFromParam(params.get("status")));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [open, setOpen] = useState<StaffListing | null>(null);

  const ACTION_LABELS: Record<string, string> = {
    approve: "Approving…",
    reject: "Rejecting…",
    deactivate: "Deactivating…",
    delete: "Deleting…",
    reactivate: "Reactivating…",
  };
  const orderKey = `najik-listing-order:${category || "all"}`;
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
    setLoading(true);
    try {
      const status =
        tab === "Pending"
          ? "pending"
          : tab === "Approved"
            ? "approved"
            : tab === "Rejected"
              ? "rejected"
              : tab === "Deactivated"
                ? "deactivated"
                : undefined;
      const data = await listStaffListingsPage({
        category,
        status,
        urgent: tab === "Urgent" || undefined,
        page,
        page_size: 20,
      });
      setItems(data.results);
      setHasNext(data.has_next);
      if (data.counts) setCounts(data.counts);
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTab(tabFromParam(params.get("status")));
    setPage(1);
  }, [params]);

  useEffect(() => {
    if (!apiSession) {
      setItems([]);
      setLoading(false);
      setError("Sign in with a staff account to review live listings.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), ADMIN_POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [apiSession, category, tab, page]);

  useEffect(() => {
    setOpen((prev) => (prev ? items.find((i) => i.id === prev.id) || prev : prev));
  }, [items]);

  useEffect(() => {
    if (!openId) return;
    if (autoOpenedId.current === openId) return;
    const match = items.find((item) => item.id === openId);
    if (!match) return;
    autoOpenedId.current = openId;
    setOpen(match);
  }, [openId, items]);

  function closeDrawer() {
    if (openId) autoOpenedId.current = openId;
    setOpen(null);
    if (!openId) return;
    const q = new URLSearchParams(params.toString());
    q.delete("id");
    const query = q.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setTabAndUrl(next: string) {
    const nextTab = (TABS.find((t) => t === next) || "All") as (typeof TABS)[number];
    setTab(nextTab);
    setPage(1);
    const q = new URLSearchParams();
    // Keep category-style filters that identify the page, drop sticky status/type/featured
    // so switching tabs never stays stuck on a previous sidebar query.
    if (params.get("kind")) q.set("kind", params.get("kind")!);
    if (nextTab === "All") {
      /* no status */
    } else {
      q.set("status", nextTab.toLowerCase());
    }
    const query = q.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function setStatus(
    id: string,
    status: "approved" | "rejected" | "deactivated",
    note?: string,
    actionKey?: string,
  ) {
    if (!canUpdate) {
      setError("You only have view access for this section.");
      return;
    }
    const key = actionKey || `${id}:${status === "approved" ? "approve" : status === "rejected" ? "reject" : "deactivate"}`;
    setBusyAction(key);
    try {
      await patchStaffListing(id, status, note ?? reason);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update listing.");
    } finally {
      setBusyAction(null);
    }
  }

  async function deactivateListing(row: StaffListing) {
    const note = window.prompt(
      "Deactivate this listing and tell the seller why (shown on their home & profile):",
      reason || "",
    );
    if (note == null) return;
    if (!note.trim()) {
      window.alert("A note for the seller is required.");
      return;
    }
    await setStatus(row.id, "deactivated", note.trim(), `${row.id}:deactivate`);
  }

  async function removeListing(id: string) {
    if (!canDelete) {
      setError("You don't have delete permission for this section.");
      return;
    }
    if (!window.confirm("Delete this listing permanently? Buyers will no longer see it.")) return;
    setBusyAction(`${id}:delete`);
    try {
      await deleteStaffListing(id);
      if (open?.id === id) setOpen(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete listing.");
    } finally {
      setBusyAction(null);
    }
  }

  const pendingCount = counts?.pending ?? items.filter((i) => i.status === "pending" || i.has_pending_edit).length;

  const visible = useMemo(() => {
    const featuredOnly = params.get("featured") === "1";
    let filtered =
      tab === "All"
        ? items
        : tab === "Pending"
          ? items.filter((i) => i.status === "pending" || i.has_pending_edit)
          : tab === "Urgent"
            ? items.filter((i) => i.is_urgent)
            : items.filter((i) => i.status === tab.toLowerCase());
    if (featuredOnly) filtered = filtered.filter((i) => i.is_promoted || i.promote_requested);
    const typeFilter = params.get("type");
    if (typeFilter) {
      filtered = filtered.filter(
        (i) =>
          i.subcategory.toLowerCase() === typeFilter.toLowerCase() ||
          String(i.extras?.dealType || "").toLowerCase() === typeFilter.toLowerCase(),
      );
    }
    const rank = new Map(orderIds.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => {
      const latest = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (latest !== 0) return latest;
      const owner = (a.owner_name || "").localeCompare(b.owner_name || "");
      if (owner !== 0) return owner;
      const ai = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER / 2;
      const bi = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER / 2;
      return ai - bi;
    });
  }, [items, tab, orderIds, params]);

  function moveRow(row: StaffListing, direction: -1 | 1) {
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

  const columns: Column<StaffListing>[] = [
    {
      key: "title",
      label: "Listing",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.owner_name || row.title} id={row.owner_id || row.id} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.title}</p>
            <p className="truncate text-xs text-muted">{row.owner_name}</p>
          </div>
        </div>
      ),
    },
    { key: "category", label: "Category", render: (row) => row.category },
    { key: "subcategory", label: "Type", render: (row) => row.subcategory || String(row.extras?.dealType || "—") },
    {
      key: "location",
      label: "Location",
      render: (row) => <span className="line-clamp-2 max-w-[220px] text-xs">{row.location}</span>,
    },
    { key: "price", label: "Price", render: (row) => (row.price ? `Rs. ${row.price}` : "—") },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.has_pending_edit ? "edit pending" : row.status} />,
    },
    {
      key: "created_at",
      label: "Submitted",
      render: (row) => <span className="text-xs text-muted">{relativeTime(row.created_at)}</span>,
      sortValue: (row) => new Date(row.created_at).getTime(),
    },
  ];

  const rowActions: RowMenuAction<StaffListing>[] = [
    ...(canUpdate
      ? [
          {
            label: "Deactivate",
            danger: true,
            onClick: (row: StaffListing) => void deactivateListing(row),
          },
          {
            label: "Reactivate",
            onClick: (row: StaffListing) => {
              if (row.status !== "deactivated" && row.status !== "rejected") {
                window.alert("Only deactivated or rejected listings need reactivation.");
                return;
              }
              void setStatus(row.id, "approved", "");
            },
          },
          { label: "Move up", onClick: (row: StaffListing) => moveRow(row, -1) },
          { label: "Move down", onClick: (row: StaffListing) => moveRow(row, 1) },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: "Delete",
            danger: true,
            onClick: (row: StaffListing) => void removeListing(row.id),
          },
        ]
      : []),
  ];

  const extras = open?.extras || {};

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
          { label: "Listings", value: counts?.total ?? items.length, tone: "brand" },
          { label: "Pending / edits", value: pendingCount, tone: "amber" },
          { label: "Approved", value: counts?.approved ?? items.filter((i) => i.status === "approved").length, tone: "green" },
          { label: "Rejected", value: counts?.rejected ?? items.filter((i) => i.status === "rejected").length, tone: "red" },
          { label: "Deactivated", value: counts?.deactivated ?? items.filter((i) => i.status === "deactivated").length, tone: "amber" },
        ]}
      />
      <div className="mb-3 flex justify-end">
        {updatedAt ? <p className="text-[11px] text-muted">Updated {formatNptTime(updatedAt.toISOString())}</p> : null}
      </div>
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      <DataTable
        rows={visible}
        columns={columns}
        tabs={[...TABS]}
        tab={tab}
        onTab={setTabAndUrl}
        onRow={setOpen}
        rowActions={rowActions}
        searchPlaceholder="Filter listings…"
        loading={loading}
        loadingLabel="Loading listings…"
        emptyLabel="No listings in this view."
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-muted">Page {page}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <DetailOverlay
        open={!!open}
        title={open?.title || "Listing"}
        onClose={closeDrawer}
        details={
          open ? (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={open.owner_name || open.title} id={open.owner_id || open.id} size={44} />
                <div>
                  <p className="font-semibold text-ink">{open.owner_name}</p>
                  <StatusBadge status={open.has_pending_edit ? "edit pending" : open.status} />
                </div>
              </div>
              <DetailKv label="Category" value={open.category} />
              <DetailKv label="Type" value={open.subcategory || String(extras.dealType || "—")} />
              <DetailKv label="Price" value={`Rs. ${open.price}${open.negotiable ? " (negotiable)" : ""}`} />
              <DetailKv label="Location" value={open.location} />
              <DetailKv label="Contact" value={open.contact_phone} />
              <DetailKv label="Reach via" value={open.contact_via} />
              {extras.company ? <DetailKv label="Company" value={String(extras.company)} /> : null}
              {extras.experience ? <DetailKv label="Experience" value={String(extras.experience)} /> : null}
              {extras.make ? <DetailKv label="Vehicle" value={`${extras.make} ${extras.model || ""}`.trim()} /> : null}
              {extras.condition ? <DetailKv label="Condition" value={String(extras.condition)} /> : null}
              <DetailKv label="Promote requested" value={open.promote_requested ? "Yes" : "No"} />
              <DetailKv label="Submitted" value={formatNptDateTime(open.created_at)} />
              <DetailKv label="Views" value={String(open.view_count || 0)} />
              <div className="mt-3">
                <p className="text-xs text-muted">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{open.description || "—"}</p>
              </div>
              {open.has_pending_edit && open.pending_edit ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                  <p className="font-semibold text-ink">Edit request</p>
                  <p className="mt-1 text-muted">Proposed title: {String(open.pending_edit.title || open.title)}</p>
                  <p className="mt-1 text-ink">{String(open.pending_edit.description || "")}</p>
                </div>
              ) : null}
              {open.admin_reason ? <p className="mt-3 text-sm text-red">Last reason: {open.admin_reason}</p> : null}
            </div>
          ) : null
        }
        documents={
          open
            ? open.photos.map((photo, index) => ({
                label: `Photo ${index + 1}`,
                src: photo.url,
              }))
            : []
        }
        footer={
          open ? (
            <div className="space-y-3">
              {readOnly ? (
                <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-xs text-muted">
                  View-only access — you cannot approve, reject, deactivate, or delete listings.
                </p>
              ) : null}
              {open.status === "approved" && canUpdate ? (
                <UrgentListingControls listing={open} onUpdated={() => void load()} />
              ) : null}
              {canUpdate && (open.status === "pending" || open.has_pending_edit) ? (
                <>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Rejection / deactivation note for the seller"
                    className={`${inputClass} min-h-[4rem]`}
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      loading={busyAction === `${open.id}:approve`}
                      loadingLabel={ACTION_LABELS.approve}
                      disabled={!!busyAction}
                      onClick={() => void setStatus(open.id, "approved", undefined, `${open.id}:approve`)}
                    >
                      {open.has_pending_edit ? "Approve edit" : "Approve"}
                    </Btn>
                    <Btn
                      kind="danger"
                      loading={busyAction === `${open.id}:reject`}
                      loadingLabel={ACTION_LABELS.reject}
                      disabled={!!busyAction}
                      onClick={() => void setStatus(open.id, "rejected", undefined, `${open.id}:reject`)}
                    >
                      {open.has_pending_edit ? "Reject edit" : "Reject"}
                    </Btn>
                    <Btn
                      kind="danger"
                      loading={busyAction === `${open.id}:deactivate`}
                      loadingLabel={ACTION_LABELS.deactivate}
                      disabled={!!busyAction}
                      onClick={() => void deactivateListing(open)}
                    >
                      Deactivate
                    </Btn>
                    {canDelete ? (
                      <Btn
                        kind="danger"
                        loading={busyAction === `${open.id}:delete`}
                        loadingLabel={ACTION_LABELS.delete}
                        disabled={!!busyAction}
                        onClick={() => void removeListing(open.id)}
                      >
                        Delete
                      </Btn>
                    ) : null}
                  </div>
                </>
              ) : canUpdate ? (
                <div className="flex flex-wrap gap-2">
                  {open.status === "deactivated" || open.status === "rejected" ? (
                    <Btn
                      loading={busyAction === `${open.id}:reactivate`}
                      loadingLabel={ACTION_LABELS.reactivate}
                      disabled={!!busyAction}
                      onClick={() => void setStatus(open.id, "approved", "", `${open.id}:reactivate`)}
                    >
                      Reactivate listing
                    </Btn>
                  ) : null}
                  {open.status === "approved" ? (
                    <Btn
                      kind="danger"
                      loading={busyAction === `${open.id}:deactivate`}
                      loadingLabel={ACTION_LABELS.deactivate}
                      disabled={!!busyAction}
                      onClick={() => void deactivateListing(open)}
                    >
                      Deactivate
                    </Btn>
                  ) : null}
                  {canDelete ? (
                    <Btn
                      kind="danger"
                      loading={busyAction === `${open.id}:delete`}
                      loadingLabel={ACTION_LABELS.delete}
                      disabled={!!busyAction}
                      onClick={() => void removeListing(open.id)}
                    >
                      Delete listing
                    </Btn>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  );
}
