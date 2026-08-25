"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listStaffListings, type StaffListing } from "@/lib/staff-api";
import { staffListingDetailHref } from "@/lib/staff-listing-nav";
import { relativeTime } from "@/lib/format";
import { Btn, StatusBadge } from "./ui";
import { UrgentListingControls } from "./urgent-listing-controls";

export function UserListingsPanel({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<StaffListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listStaffListings({ owner: userId, page_size: 50 });
      setRows(all);
      setError("");
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not load listings.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">Listings by {userName}</p>
            <p className="text-[11px] text-muted">{rows.length} listing{rows.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-2 py-10 text-sm text-muted">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              Loading listings…
            </div>
          ) : null}
          {error ? <p className="px-2 py-4 text-sm text-red">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">No listings posted yet.</p>
          ) : null}
          {rows.map((row) => (
            <div key={row.id} className="mb-2 rounded-xl border border-line bg-elevated">
              <button
                type="button"
                onClick={() => setExpanded((id) => (id === row.id ? null : row.id))}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{row.title}</p>
                  <p className="text-[11px] text-muted">
                    {row.category} · {row.location} · {relativeTime(row.created_at)}
                  </p>
                </div>
                <StatusBadge status={row.is_urgent ? "urgent" : row.has_pending_edit ? "edit pending" : row.status} />
              </button>
              {expanded === row.id ? (
                <div className="border-t border-line px-3 pb-3">
                  <UrgentListingControls listing={row} rbacSource="listing" compact onUpdated={() => void load()} />
                  <div className="mt-2 flex gap-2">
                    <Btn
                      kind="ghost"
                      onClick={() => {
                        onClose();
                        router.push(staffListingDetailHref(row));
                      }}
                    >
                      Open listing page
                    </Btn>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3">
          <Btn kind="ghost" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
}
