"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "./ui";
import { UrgentListingControls } from "./urgent-listing-controls";
import { listUrgentStaffListings, type StaffListing } from "@/lib/staff-api";
import { relativeTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { ReadOnlyBanner, useRbacGuard } from "@/lib/use-page-rbac";

export function UrgentSellAdminPanel() {
  const { toast } = useAdmin();
  const { readOnly } = useRbacGuard("app_control");
  const [rows, setRows] = useState<StaffListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listUrgentStaffListings());
    } catch (err) {
      setRows([]);
      toast(err instanceof Error ? err.message : "Could not load urgent listings.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-4 rounded border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Urgent Sell queue</h2>
          <p className="mt-1 text-[12px] text-muted">
            Listings shown between the home banner and categories. Timers count down for buyers; expired listings drop automatically.
          </p>
        </div>
        <Btn kind="ghost" onClick={() => void load()} loading={loading} loadingLabel="Refreshing…">
          Refresh
        </Btn>
      </div>
      {readOnly ? <ReadOnlyBanner label="Urgent Sell" /> : null}
      {loading ? <p className="mt-3 text-sm text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No urgent listings — buyer home shows no gap.</p>
      ) : null}
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-line bg-elevated p-3">
            <p className="font-medium text-ink">{row.title}</p>
            <p className="text-[11px] text-muted">
              {row.owner_name} · {row.category} · ends {row.urgent_ends_at ? relativeTime(row.urgent_ends_at) : "—"}
            </p>
            <div className="mt-2">
              <UrgentListingControls listing={row} compact onUpdated={() => void load()} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
