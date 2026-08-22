"use client";

import { useState } from "react";
import { Btn, Field, inputClass } from "./ui";
import { removeStaffListingUrgent, setStaffListingUrgent, type StaffListing } from "@/lib/staff-api";

const PRESETS = [
  { label: "5 hours", hours: 5, days: 0 },
  { label: "1 day", hours: 0, days: 1 },
  { label: "3 days", hours: 0, days: 3 },
  { label: "5 days", hours: 0, days: 5 },
] as const;

export function UrgentListingControls({
  listing,
  onUpdated,
  compact,
}: {
  listing: StaffListing;
  onUpdated?: () => void;
  compact?: boolean;
}) {
  const [hours, setHours] = useState("5");
  const [days, setDays] = useState("0");
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<void>) {
    setLoading(action);
    try {
      await fn();
      onUpdated?.();
    } finally {
      setLoading(null);
    }
  }

  const active = Boolean(listing.is_urgent);

  return (
    <div className={`rounded-xl border border-line bg-elevated ${compact ? "p-2" : "p-3"}`}>
      <p className="text-xs font-semibold text-ink">Urgent Sell</p>
      <p className="mt-0.5 text-[11px] text-muted">
        {active
          ? `Live until ${listing.urgent_ends_at ? new Date(listing.urgent_ends_at).toLocaleString() : "—"}`
          : "Feature this listing in the buyer Urgent Sell row with a countdown."}
      </p>
      {!compact ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded-lg border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink hover:bg-elevated"
              onClick={() => {
                setHours(String(p.hours));
                setDays(String(p.days));
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={`mt-2 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {!compact ? (
          <>
            <Field label="Hours">
              <input className={inputClass} value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <Field label="Days">
              <input className={inputClass} value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
          </>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn
          kind="primary"
          loading={loading === "add"}
          loadingLabel="Adding…"
          disabled={active}
          onClick={() =>
            void run("add", async () => {
              await setStaffListingUrgent(listing.id, {
                duration_hours: Number(hours) || 0,
                duration_days: Number(days) || 0,
              });
            })
          }
        >
          Add to Urgent Sell
        </Btn>
        {active ? (
          <Btn
            kind="danger"
            loading={loading === "remove"}
            loadingLabel="Removing…"
            onClick={() => void run("remove", async () => { await removeStaffListingUrgent(listing.id); })}
          >
            Remove from Urgent
          </Btn>
        ) : null}
      </div>
    </div>
  );
}
