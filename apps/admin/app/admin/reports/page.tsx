"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge } from "@/components/admin/ui";
import { formatNptDateTime, formatNptTime } from "@/lib/format";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import { listChatReports, patchChatReport, type ChatReportTicket } from "@/lib/staff-api";

const TABS = ["All", "Open", "Under review", "Resolved"] as const;

export default function ReportsPage() {
  const { apiSession } = useSession();
  const { markInboxSeen } = useAdmin();
  const params = useSearchParams();
  const [items, setItems] = useState<ChatReportTicket[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>(params.get("status") === "open" ? "Open" : "All");
  const [openId, setOpenId] = useState<string | null>(params.get("id"));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    if (!apiSession) return;
    try {
      setItems(await listChatReports());
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load reports.");
    }
  }

  useEffect(() => {
    if (!apiSession) {
      setItems([]);
      setError("Sign in with a staff account to review live chat reports.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), ADMIN_POLL_MS);
    return () => window.clearInterval(id);
  }, [apiSession]);

  useEffect(() => {
    const id = params.get("id");
    if (id) {
      setOpenId(id);
      markInboxSeen(`report-${id}`);
    }
  }, [params, markInboxSeen]);

  async function act(id: string, body: { status?: string; action?: string; admin_note?: string }) {
    try {
      await patchChatReport(id, body);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update report.");
    }
  }

  const visible = useMemo(() => {
    const status =
      tab === "Open" ? "open" : tab === "Under review" ? "under_review" : tab === "Resolved" ? "resolved" : "";
    return status ? items.filter((row) => row.status === status) : items;
  }, [items, tab]);

  const selected = items.find((row) => row.id === openId) || visible[0];

  return (
    <div>
      <PageHeader
        title="Reports & Complaints"
        crumb="Dashboard / Trust / Chat reports"
        summary="When a buyer or seller reports the other, the private chat transcript and both account details land here. You can pause either or both accounts."
        extra={
          <button type="button" onClick={() => void load()} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
            Refresh
          </button>
        }
      />
      <SummaryStrip
        items={[
          { label: "Tickets", value: items.length, tone: "brand" },
          { label: "Open", value: items.filter((r) => r.status === "open").length, tone: "amber" },
          { label: "Under review", value: items.filter((r) => r.status === "under_review").length, tone: "brand" },
          { label: "Resolved", value: items.filter((r) => r.status === "resolved").length, tone: "green" },
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
          No chat reports yet. A report from the app copies the full conversation and both user records into this queue.
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="max-h-[min(70vh,calc(100vh-16rem))] space-y-2 overflow-y-auto pr-1">
            {visible.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setOpenId(row.id);
                  markInboxSeen(`report-${row.id}`);
                }}
                className={`w-full rounded-2xl border px-3 py-3 text-left ${selected?.id === row.id ? "border-brand bg-brand-soft" : "border-line bg-card"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{row.listing?.title || "Listing chat"}</p>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {row.reporter.full_name} → {row.accused.full_name}
                </p>
              </button>
            ))}
          </div>
          {selected ? (
            <section className="card-glow rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-ink">{selected.listing?.title || "Listing chat"}</p>
                  <p className="text-sm text-muted">{formatNptDateTime(selected.created_at)}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <p className="mt-3 rounded-xl bg-elevated p-3 text-sm text-ink">{selected.reason}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PartyCard title="Reporter" party={selected.reporter} active={selected.reporter_active} />
                <PartyCard title="Accused" party={selected.accused} active={selected.accused_active} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Chat transcript</p>
              <div className="mt-2 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-line bg-elevated p-3">
                {selected.transcript.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <p className="text-[11px] font-semibold text-muted">
                      {msg.sender_name} · {msg.kind} · {formatNptTime(msg.created_at)}
                    </p>
                    <p className="text-ink">{msg.text || msg.location_label || msg.kind}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={() => void act(selected.id, { status: "under_review" })}>Under review</Btn>
                <Btn onClick={() => void act(selected.id, { status: "resolved" })}>Resolve</Btn>
                <Btn kind="danger" onClick={() => void act(selected.id, { action: "block_reporter", status: "under_review" })}>
                  Block reporter
                </Btn>
                <Btn kind="danger" onClick={() => void act(selected.id, { action: "block_accused", status: "under_review" })}>
                  Block accused
                </Btn>
                <Btn kind="danger" onClick={() => void act(selected.id, { action: "block_both", status: "under_review" })}>
                  Block both
                </Btn>
                <Btn onClick={() => void act(selected.id, { action: "unblock_both" })}>Unblock both</Btn>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PartyCard({
  title,
  party,
  active,
}: {
  title: string;
  party: ChatReportTicket["reporter"];
  active: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-3 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 font-medium text-ink">{party.full_name}</p>
      <p className="text-muted">{party.account_type === "provider" ? "Seller" : "Buyer"}</p>
      <p className="mt-2 text-ink">{party.phone || "—"}</p>
      <p className="text-ink">{party.email || "—"}</p>
      <p className="mt-2 text-xs text-muted">{active ? "Account active" : "Account blocked"}</p>
    </div>
  );
}
