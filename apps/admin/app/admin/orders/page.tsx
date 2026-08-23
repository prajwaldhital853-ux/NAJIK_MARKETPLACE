"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge } from "@/components/admin/ui";
import { formatNptDateTime } from "@/lib/format";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import { useSession } from "@/lib/session";
import { listStaffBookings, type StaffBooking } from "@/lib/staff-api";

const STATUS_TABS = ["All", "Pending", "Accepted", "Cancelled", "Rejected"] as const;

export default function OrdersPage() {
  const { apiSession } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState<StaffBooking[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>(
    params.get("status") === "pending"
      ? "Pending"
      : params.get("status") === "accepted"
        ? "Accepted"
        : params.get("status") === "cancelled"
          ? "Cancelled"
          : params.get("status") === "rejected"
            ? "Rejected"
            : "All",
  );

  async function load() {
    if (!apiSession) return;
    try {
      const status = tab === "All" ? undefined : tab.toLowerCase();
      setRows(await listStaffBookings(status));
      setError("");
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not load bookings.");
    }
  }

  useEffect(() => {
    if (!apiSession) {
      setError("Sign in with a staff account to view bookings.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), ADMIN_POLL_MS);
    return () => window.clearInterval(id);
  }, [apiSession, tab]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      accepted: rows.filter((r) => r.status === "accepted").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
    }),
    [rows],
  );

  function setTabAndUrl(next: (typeof STATUS_TABS)[number]) {
    setTab(next);
    const qs = new URLSearchParams();
    if (next !== "All") qs.set("status", next.toLowerCase());
    const suffix = qs.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders & Bookings" summary="Live booking requests between buyers and sellers on NAJIK listings." />
      <SummaryStrip
        items={[
          { label: "Bookings", value: counts.all, tone: "brand" },
          { label: "Pending", value: counts.pending, tone: "amber" },
          { label: "Accepted", value: counts.accepted, tone: "green" },
          { label: "Cancelled", value: counts.cancelled, tone: "red" },
        ]}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((label) => (
          <Btn key={label} kind={tab === label ? "primary" : "ghost"} onClick={() => setTabAndUrl(label)}>
            {label}
          </Btn>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-sm text-ink">
          <thead className="bg-elevated text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{row.listing_title}</td>
                <td className="px-4 py-3">{row.requester_name}</td>
                <td className="px-4 py-3">{row.listing_owner_name}</td>
                <td className="px-4 py-3 text-muted">{formatNptDateTime(row.scheduled_at)}</td>
                <td className="px-4 py-3">{row.location || row.city || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status === "accepted" ? "active" : row.status} />
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">No bookings in this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
