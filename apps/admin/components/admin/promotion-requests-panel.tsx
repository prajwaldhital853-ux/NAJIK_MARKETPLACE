"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "./ui";
import { listPromoteStaffListings, removeStaffListingPromote, setStaffListingPromote, type StaffListing } from "@/lib/staff-api";
import { relativeTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";

export function PromotionRequestsPanel() {
  const { toast } = useAdmin();
  const [rows, setRows] = useState<StaffListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPromoteStaffListings());
    } catch (err) {
      setRows([]);
      toast(err instanceof Error ? err.message : "Could not load promotion requests.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await setStaffListingPromote(id);
      toast("Listing is now featured in the buyer feed.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not approve promotion.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await removeStaffListingPromote(id);
      toast("Promotion removed.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove promotion.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Listing post promotion queue</h2>
          <p className="mt-1 text-[12px] text-muted">
            Sellers request promotion when posting. Approve here — no in-app payment. Featured badge shows after admin approval.
          </p>
        </div>
        <Btn kind="ghost" onClick={() => void load()} loading={loading} loadingLabel="Refreshing…">
          Refresh
        </Btn>
      </div>
      {loading ? <p className="mt-3 text-sm text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No pending promotion requests.</p>
      ) : null}
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-line bg-elevated p-3">
            <p className="font-medium text-ink">{row.title}</p>
            <p className="text-[11px] text-muted">
              {row.owner_name} · {row.category} · updated {relativeTime(row.updated_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn
                onClick={() => void approve(row.id)}
                loading={busyId === row.id}
                loadingLabel="Featuring…"
              >
                Approve featured
              </Btn>
              <Btn
                kind="ghost"
                onClick={() => void remove(row.id)}
                loading={busyId === row.id}
                loadingLabel="Removing…"
              >
                Dismiss request
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
