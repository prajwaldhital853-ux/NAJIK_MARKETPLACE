"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";
import { fetchSystemStatus, type SystemStatus } from "@/lib/staff-api";
import { formatNptTime } from "@/lib/format";

export function OperationalStatus({
  className = "",
}: {
  className?: string;
}) {
  const { apiSession } = useSession();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!apiSession) return;
    setBusy(true);
    try {
      setStatus(await fetchSystemStatus());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load status.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!apiSession) return;
    void load();
    const id = window.setInterval(() => void load(), Math.max(ADMIN_POLL_MS, 30_000));
    return () => window.clearInterval(id);
  }, [apiSession]);

  const overall = status?.overall || "attention";
  const dot =
    overall === "operational" ? "bg-green" : overall === "attention" ? "bg-amber" : "bg-red";
  const label = status?.label || (error ? "Status unavailable" : "Checking…");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        className={`mt-1 flex w-full items-center justify-between px-2 text-[10px] text-faint hover:text-ink ${className}`}
      >
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </span>
        <span>v2.5.0</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">System operational status</p>
                <p className="text-[11px] text-muted">
                  {status?.checked_at ? `Checked ${formatNptTime(status.checked_at)} NPT` : "Live checks from the API"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                  aria-label="Refresh"
                >
                  <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-elevated">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="admin-scroll max-h-[calc(88vh-4rem)] space-y-2 overflow-y-auto p-4">
              {error ? <p className="text-sm text-red">{error}</p> : null}
              {!status && !error ? <p className="text-sm text-muted">Loading checks…</p> : null}
              {status?.checks.map((item) => {
                const tone =
                  item.status === "problem" ? "problem" : item.status === "attention" ? "attention" : "ok";
                return (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    tone === "ok"
                      ? "border-line bg-elevated/40"
                      : tone === "attention"
                        ? "border-amber/35 bg-amber-soft/50"
                        : "border-red/30 bg-red-soft/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {tone === "ok" ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green" />
                    ) : (
                      <AlertTriangle
                        size={16}
                        className={`mt-0.5 shrink-0 ${tone === "attention" ? "text-amber" : "text-red"}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{item.label}</p>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            tone === "ok" ? "text-green" : tone === "attention" ? "text-amber" : "text-red"
                          }`}
                        >
                          {tone === "ok" ? "Active" : tone === "attention" ? "Needs review" : "Problem"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted">{item.detail}</p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="mt-1 inline-block text-[11px] font-semibold text-brand hover:underline"
                        >
                          Open in admin →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
