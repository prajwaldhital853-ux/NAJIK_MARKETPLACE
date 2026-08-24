"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { Btn, StatusBadge } from "@/components/admin/ui";
import { formatNptDateTime } from "@/lib/format";
import { ADMIN_POLL_FALLBACK_MS } from "@/lib/event-stream";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import {
  getEngagementSummary,
  listEngagement,
  patchEngagementComment,
  patchEngagementReview,
  type EngagementRow,
  type EngagementSummary,
} from "@/lib/staff-api";

const KIND_TABS = ["All", "Comments", "Reviews", "Hidden"] as const;

function tabFromParams(kind: string | null): (typeof KIND_TABS)[number] {
  if (kind === "comment") return "Comments";
  if (kind === "review") return "Reviews";
  if (kind === "hidden") return "Hidden";
  return "All";
}

export default function ReviewsPage() {
  const { apiSession } = useSession();
  const { toast } = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [rows, setRows] = useState<EngagementRow[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof KIND_TABS)[number]>(tabFromParams(params.get("kind")));
  const [openId, setOpenId] = useState<string | null>(params.get("id"));
  const [busy, setBusy] = useState(false);

  function writeTab(next: (typeof KIND_TABS)[number], id?: string | null) {
    setTab(next);
    const qs = new URLSearchParams();
    if (next === "Comments") qs.set("kind", "comment");
    else if (next === "Reviews") qs.set("kind", "review");
    else if (next === "Hidden") qs.set("kind", "hidden");
    const open = id === undefined ? openId : id;
    if (open) qs.set("id", open);
    const suffix = qs.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function closeDetail() {
    setOpenId(null);
    writeTab(tab, null);
  }

  async function load() {
    if (!apiSession) return;
    try {
      const kind = tab === "Comments" ? "comment" : tab === "Reviews" ? "review" : "all";
      const hidden = tab === "Hidden" ? true : undefined;
      const [sum, list] = await Promise.all([
        getEngagementSummary(),
        listEngagement({ kind, hidden }),
      ]);
      setSummary(sum);
      setRows(list);
      setError("");
    } catch (err) {
      setSummary(null);
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not load reviews.");
    }
  }

  useEffect(() => {
    if (!apiSession) {
      setError("Sign in with a staff account to moderate comments and reviews.");
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), ADMIN_POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [apiSession, tab]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && openId) closeDetail();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, tab]);

  const open = useMemo(() => rows.find((row) => row.id === openId) || null, [rows, openId]);

  async function moderate(action: "hide" | "show" | "delete") {
    if (!open) return;
    setBusy(true);
    try {
      if (open.kind === "comment") await patchEngagementComment(open.id, action);
      else await patchEngagementReview(open.id, action);
      toast(action === "delete" ? "Removed" : action === "hide" ? "Hidden" : "Restored");
      if (action === "delete") closeDetail();
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const filtered =
    tab === "Comments"
      ? rows.filter((r) => r.kind === "comment")
      : tab === "Reviews"
        ? rows.filter((r) => r.kind === "review")
        : rows;

  const tableScroll = filtered.length > 10;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews & Ratings"
        summary="Buyer comments on listings and seller star ratings. Hide or delete content that breaks posting rules."
      />
      <SummaryStrip
        items={[
          { label: "Comments", value: summary?.comment_count ?? "—", tone: "brand" },
          { label: "Seller reviews", value: summary?.review_count ?? "—", tone: "green" },
          { label: "Average stars", value: summary ? summary.rating_avg.toFixed(1) : "—", tone: "green" },
          {
            label: "Hidden",
            value: summary ? (summary.comment_hidden ?? 0) + (summary.review_hidden ?? 0) : "—",
            tone: "red",
          },
          { label: "Five star", value: summary?.five_star ?? "—", tone: "amber" },
        ]}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {KIND_TABS.map((label) => (
          <Btn key={label} kind={tab === label ? "primary" : "ghost"} onClick={() => writeTab(label)}>
            {label}
          </Btn>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className={tableScroll ? "max-h-[520px] overflow-y-auto admin-scroll" : undefined}>
          <table className="w-full text-left text-sm text-ink">
            <thead className="sticky top-0 z-10 bg-elevated text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Posted by</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Stars</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={`${row.kind}-${row.id}`}
                  className="cursor-pointer border-t border-line hover:bg-elevated/60 text-ink"
                  onClick={() => {
                    setOpenId(row.id);
                    writeTab(tab, row.id);
                  }}
                >
                  <td className="px-4 py-3 font-medium">{row.listing_title || "—"}</td>
                  <td className="px-4 py-3">{row.author_name}</td>
                  <td className="px-4 py-3">{row.listing_owner_name}</td>
                  <td className="px-4 py-3 capitalize">{row.kind}</td>
                  <td className="px-4 py-3">{row.rating ? `${row.rating} / 5` : "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatNptDateTime(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.is_hidden ? "hidden" : "active"} />
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">No comments or reviews in this filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={closeDetail}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Review detail"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{open.kind}</p>
                <h3 className="text-lg font-bold text-ink">{open.listing_title}</h3>
                <p className="text-sm text-muted">
                  Seller: {open.listing_owner_name} · {open.listing_city || "—"}
                </p>
                <p className="text-sm text-muted">By {open.author_name}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={open.is_hidden ? "hidden" : "active"} />
              {open.rating ? <span className="text-sm font-bold text-ink">{open.rating} / 5 stars</span> : null}
            </div>
            <p className="mt-3 rounded-xl bg-elevated p-3 text-sm leading-relaxed text-ink">{open.text || "No text"}</p>
            <p className="mt-2 text-xs text-muted">{formatNptDateTime(open.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!open.is_hidden ? (
                <Btn kind="ghost" disabled={busy} onClick={() => void moderate("hide")}>Hide</Btn>
              ) : (
                <Btn kind="ghost" disabled={busy} onClick={() => void moderate("show")}>Show again</Btn>
              )}
              <Btn kind="danger" disabled={busy} onClick={() => void moderate("delete")}>Delete</Btn>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
