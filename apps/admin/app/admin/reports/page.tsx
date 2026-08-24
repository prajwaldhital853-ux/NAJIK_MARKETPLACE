"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge, inputClass } from "@/components/admin/ui";
import { formatNptDateTime, formatNptTime } from "@/lib/format";
import { ADMIN_POLL_FALLBACK_MS } from "@/lib/event-stream";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import { listComplaints, patchComplaint, type ComplaintTicket } from "@/lib/staff-api";

const STATUS_TABS = ["All", "Open", "Under review", "Resolved"] as const;
const SECTION_TABS = [
  { id: "buyer", label: "Buyer complain" },
  { id: "seller", label: "Seller complain" },
  { id: "chat", label: "Complain from chat" },
] as const;

type ComplaintSection = "buyer" | "seller" | "chat";

const KIND_LABEL: Record<string, string> = {
  user: "User report",
  listing: "Listing report",
  chat: "Chat report",
};

const SECTION_LABEL: Record<ComplaintSection, string> = {
  buyer: "Buyer complaint",
  seller: "Seller complaint",
  chat: "Chat / conversation",
};

function complaintSection(row: ComplaintTicket): ComplaintSection {
  if (row.kind === "chat") return "chat";
  if (row.reporter?.account_type === "provider") return "seller";
  return "buyer";
}

function parseSectionParam(value: string | null): "all" | ComplaintSection {
  if (value === "buyer" || value === "seller" || value === "chat") return value;
  return "all";
}

export default function ReportsPage() {
  const { apiSession } = useSession();
  const { markInboxSeen, toast } = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ComplaintTicket[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");
  const [section, setSection] = useState<"all" | ComplaintSection>(parseSectionParam(params.get("section")));
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>(
    params.get("status") === "open"
      ? "Open"
      : params.get("status") === "under_review"
        ? "Under review"
        : params.get("status") === "resolved"
          ? "Resolved"
          : "All",
  );
  const [highOnly, setHighOnly] = useState(params.get("severity") === "high");
  const [openId, setOpenId] = useState<string | null>(params.get("id"));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [warningNote, setWarningNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  function writeFilters(next: {
    section?: "all" | ComplaintSection;
    tab?: (typeof STATUS_TABS)[number];
    highOnly?: boolean;
    openId?: string | null;
  }) {
    const nextSection = next.section ?? section;
    const nextTab = next.tab ?? tab;
    const nextHigh = next.highOnly ?? highOnly;
    const nextOpen = next.openId === undefined ? openId : next.openId;
    if (next.section !== undefined) setSection(next.section);
    if (next.tab !== undefined) setTab(next.tab);
    if (next.highOnly !== undefined) setHighOnly(next.highOnly);
    if (next.openId !== undefined) setOpenId(next.openId);

    const qs = new URLSearchParams();
    if (nextSection !== "all") qs.set("section", nextSection);
    if (nextTab === "Open") qs.set("status", "open");
    else if (nextTab === "Under review") qs.set("status", "under_review");
    else if (nextTab === "Resolved") qs.set("status", "resolved");
    if (nextHigh) qs.set("severity", "high");
    if (nextOpen) qs.set("id", nextOpen);
    const suffix = qs.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  async function load(nextPage = page) {
    if (!apiSession) return;
    try {
      const status =
        tab === "Open" ? "open" : tab === "Under review" ? "under_review" : tab === "Resolved" ? "resolved" : undefined;
      const kind = section === "chat" ? "chat" : section === "buyer" || section === "seller" ? "user" : undefined;
      const data = await listComplaints({
        page: nextPage,
        page_size: 25,
        ...(status ? { status } : {}),
        ...(highOnly ? { severity: "high" } : {}),
        ...(kind ? { kind } : {}),
      });
      setItems(data.results);
      setHasNext(data.has_next);
      setTotalCount(data.count);
      setPage(nextPage);
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
      setError("Sign in with a staff account to review reports and complaints.");
      return;
    }
    setPage(1);
    void load(1);
    const id = window.setInterval(() => void load(page), ADMIN_POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [apiSession, tab, section, highOnly]);

  useEffect(() => {
    const id = params.get("id");
    if (id) {
      setOpenId(id);
      markInboxSeen(`report-${id}`);
    } else {
      setOpenId(null);
    }
    setHighOnly(params.get("severity") === "high");
    setSection(parseSectionParam(params.get("section")));
    const status = params.get("status");
    if (status === "open") setTab("Open");
    else if (status === "under_review") setTab("Under review");
    else if (status === "resolved") setTab("Resolved");
    else setTab("All");
  }, [params, markInboxSeen]);

  const sectionCounts = useMemo(() => {
    const counts = { buyer: 0, seller: 0, chat: 0 };
    items.forEach((row) => {
      counts[complaintSection(row)] += 1;
    });
    return counts;
  }, [items]);

  const visible = useMemo(() => {
    const status =
      tab === "Open" ? "open" : tab === "Under review" ? "under_review" : tab === "Resolved" ? "resolved" : "";
    return items.filter((row) => {
      if (section !== "all" && complaintSection(row) !== section) return false;
      if (status && row.status !== status) return false;
      if (highOnly && row.severity !== "high") return false;
      return true;
    });
  }, [items, tab, highOnly, section]);

  const grouped = useMemo(() => {
    const buckets: Record<ComplaintSection, ComplaintTicket[]> = { buyer: [], seller: [], chat: [] };
    visible.forEach((row) => {
      buckets[complaintSection(row)].push(row);
    });
    return buckets;
  }, [visible]);

  const selected = items.find((row) => row.id === openId) || visible[0] || null;

  useEffect(() => {
    if (!selected) {
      setWarningNote("");
      setAdminNote("");
      return;
    }
    setWarningNote(selected.warning_message || "");
    setAdminNote(selected.admin_note || "");
  }, [selected?.id]);

  async function act(body: {
    status?: string;
    action?: string;
    admin_note?: string;
    warning_message?: string;
  }) {
    if (!selected) return;
    setBusy(true);
    try {
      await patchComplaint(selected.id, body);
      toast("Complaint updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update complaint.");
    } finally {
      setBusy(false);
    }
  }

  function titleFor(row: ComplaintTicket) {
    if (row.kind === "listing") return row.listing?.title || "Listing report";
    if (row.kind === "chat") return row.listing?.title || "Chat report";
    return `${row.reporter?.full_name || "User"} → ${row.accused?.full_name || "User"}`;
  }

  return (
    <div>
      <PageHeader
        title="Reports & Complaints"
        crumb="Dashboard / Trust / Reports"
        summary="Buyers and sellers can report each other, and buyers can report listings. High-severity tickets are highlighted. Warn, block, or deactivate either party."
        extra={
          <button type="button" onClick={() => void load()} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink">
            Refresh
          </button>
        }
      />
      <SummaryStrip
        items={[
          { label: "Buyer", value: sectionCounts.buyer, tone: "brand" },
          { label: "Seller", value: sectionCounts.seller, tone: "amber" },
          { label: "Chat", value: sectionCounts.chat, tone: "green" },
          { label: "High severity", value: items.filter((r) => r.severity === "high" && r.status !== "resolved").length, tone: "red" },
        ]}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                writeFilters({
                  tab: item,
                  section: item === "All" ? "all" : section,
                });
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tab === item ? "bg-brand text-white" : "border border-line text-ink"
              }`}
            >
              {item}
            </button>
          ))}
          {SECTION_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => writeFilters({ section: section === item.id ? "all" : item.id })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                section === item.id ? "bg-brand text-white" : "border border-line text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => writeFilters({ highOnly: !highOnly })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${highOnly ? "bg-red text-white" : "border border-line text-ink"}`}
          >
            High severity
          </button>
        </div>
        {updatedAt ? <p className="text-[11px] text-muted">Updated {formatNptTime(updatedAt.toISOString())}</p> : null}
      </div>
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Page {page}
          {totalCount ? ` · ${totalCount} total` : ""}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => void load(page + 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {visible.length === 0 && !error ? (
        <section className="card-glow rounded-2xl border border-line bg-card p-6 text-sm text-muted">
          No complaints in this section yet. Buyer, seller, and chat reports each appear in their own section.
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="max-h-[min(70vh,calc(100vh-16rem))] space-y-4 overflow-y-auto pr-1">
            {(section === "all" ? (["buyer", "seller", "chat"] as ComplaintSection[]) : [section]).map((sec) => {
              const rows = section === "all" ? grouped[sec] : visible;
              if (!rows.length) return null;
              return (
                <div key={sec}>
                  {section === "all" ? (
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {SECTION_LABEL[sec]} · {rows.length}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    {rows.map((row) => (
                      <ComplaintListCard
                        key={row.id}
                        row={row}
                        active={selected?.id === row.id}
                        title={titleFor(row)}
                        sectionLabel={SECTION_LABEL[complaintSection(row)]}
                        onSelect={() => {
                          writeFilters({ openId: row.id });
                          markInboxSeen(`report-${row.id}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {selected ? (
            <section className="card-glow rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-ink">{titleFor(selected)}</p>
                  <p className="text-sm text-muted">
                    {SECTION_LABEL[complaintSection(selected)]} · {KIND_LABEL[selected.kind] || selected.kind} ·{" "}
                    {formatNptDateTime(selected.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.severity === "high" ? (
                    <span className="inline-flex rounded-full bg-red-soft px-2.5 py-0.5 text-[11px] font-semibold text-red">High severity</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-semibold text-muted">Normal</span>
                  )}
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <p className="mt-3 rounded-xl bg-elevated p-3 text-sm text-ink whitespace-pre-wrap">{selected.reason}</p>

              {selected.kind === "listing" || selected.listing?.title ? (
                <div className="mt-3 rounded-xl border border-line bg-elevated p-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Listing</p>
                  <p className="mt-1 font-medium text-ink">{selected.listing?.title || "—"}</p>
                  <p className="text-muted">
                    {[selected.listing?.price, selected.listing?.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PartyCard title="Reporter" party={selected.reporter} />
                <PartyCard title="Accused" party={selected.accused} />
              </div>

              {selected.transcript?.length ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Chat transcript</p>
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line bg-elevated p-3">
                    {selected.transcript.map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <p className="text-[11px] font-semibold text-muted">
                          {msg.sender_name} · {msg.kind} · {formatNptTime(msg.created_at)}
                        </p>
                        <p className="text-ink">{msg.text || msg.kind}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Admin note</label>
              <textarea
                className={`${inputClass} mt-1 min-h-[72px]`}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Internal note for staff…"
              />
              <div className="mt-2">
                <Btn disabled={busy} onClick={() => void act({ admin_note: adminNote })}>
                  Save note
                </Btn>
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Warning note to user</label>
              <textarea
                className={`${inputClass} mt-1 min-h-[88px]`}
                value={warningNote}
                onChange={(e) => setWarningNote(e.target.value)}
                placeholder="This message is shown in the user’s app…"
              />
              {selected.warning_sent_to ? (
                <p className="mt-1 text-xs text-muted">
                  Last warning sent to {selected.warning_sent_to}
                  {selected.warning_message ? `: “${selected.warning_message.slice(0, 80)}”` : ""}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Btn disabled={busy} onClick={() => void act({ status: "under_review" })}>
                  Under review
                </Btn>
                <Btn disabled={busy} onClick={() => void act({ status: "resolved" })}>
                  Resolve
                </Btn>
                <Btn disabled={busy} onClick={() => void act({ status: "open" })}>
                  Reopen
                </Btn>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Send warning</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn
                  disabled={busy}
                  onClick={() => void act({ action: "warn_accused", warning_message: warningNote, status: "under_review" })}
                >
                  Warn accused
                </Btn>
                <Btn
                  disabled={busy}
                  onClick={() => void act({ action: "warn_reporter", warning_message: warningNote, status: "under_review" })}
                >
                  Warn reporter
                </Btn>
                <Btn
                  disabled={busy}
                  onClick={() => void act({ action: "warn_both", warning_message: warningNote, status: "under_review" })}
                >
                  Warn both
                </Btn>
                <Btn disabled={busy} onClick={() => void act({ action: "clear_warning_accused" })}>
                  Clear accused warning
                </Btn>
                <Btn disabled={busy} onClick={() => void act({ action: "clear_warning_reporter" })}>
                  Clear reporter warning
                </Btn>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Account actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn kind="danger" disabled={busy} onClick={() => void act({ action: "block_accused", status: "under_review" })}>
                  Block accused
                </Btn>
                <Btn kind="danger" disabled={busy} onClick={() => void act({ action: "block_reporter", status: "under_review" })}>
                  Block reporter
                </Btn>
                <Btn kind="danger" disabled={busy} onClick={() => void act({ action: "block_both", status: "under_review" })}>
                  Block both
                </Btn>
                <Btn kind="danger" disabled={busy} onClick={() => void act({ action: "deactivate_accused", status: "under_review" })}>
                  Deactivate accused
                </Btn>
                <Btn kind="danger" disabled={busy} onClick={() => void act({ action: "deactivate_reporter", status: "under_review" })}>
                  Deactivate reporter
                </Btn>
                <Btn kind="danger" disabled={busy} onClick={() => void act({ action: "deactivate_both", status: "under_review" })}>
                  Deactivate both
                </Btn>
                <Btn disabled={busy} onClick={() => void act({ action: "unblock_both" })}>
                  Unblock / reactivate both
                </Btn>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ComplaintListCard({
  row,
  active,
  title,
  sectionLabel,
  onSelect,
}: {
  row: ComplaintTicket;
  active: boolean;
  title: string;
  sectionLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-3 text-left ${active ? "border-brand bg-brand-soft" : "border-line bg-card"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink line-clamp-1">{title}</p>
        <StatusBadge status={row.status} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-muted">{sectionLabel}</span>
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-muted">
          {KIND_LABEL[row.kind] || row.kind}
        </span>
        {row.severity === "high" ? (
          <span className="rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-semibold text-red">High</span>
        ) : (
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-muted">Normal</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted line-clamp-2">{row.reason}</p>
    </button>
  );
}

function PartyCard({ title, party }: { title: string; party: ComplaintTicket["reporter"] }) {
  if (!party?.id && !party?.full_name) {
    return (
      <div className="rounded-xl border border-line bg-elevated p-3 text-sm text-muted">
        <p className="text-[11px] font-semibold uppercase tracking-wide">{title}</p>
        <p className="mt-1">—</p>
      </div>
    );
  }
  const status = party.account_status || (party.is_active ? "active" : "blocked");
  return (
    <div className="rounded-xl border border-line bg-elevated p-3 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 font-medium text-ink">{party.full_name || "—"}</p>
      <p className="text-muted">{party.account_type === "provider" ? "Seller" : "Buyer"}</p>
      <p className="mt-2 text-ink">{party.phone || "—"}</p>
      <p className="text-ink">{party.email || "—"}</p>
      <p className="mt-2">
        <StatusBadge status={status} />
      </p>
      {party.staff_warning ? (
        <p className="mt-2 rounded-lg bg-amber-soft p-2 text-xs text-amber">Warning: {party.staff_warning}</p>
      ) : null}
    </div>
  );
}
