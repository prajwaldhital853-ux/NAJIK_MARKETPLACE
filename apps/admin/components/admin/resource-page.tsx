"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "./page-frame";
import { DataTable, type Column } from "./table";
import { Avatar, Btn, Drawer, Field, StatusBadge, inputClass } from "./ui";
import { useAdmin } from "@/lib/store";

export function ResourcePage<T extends { id: string; status?: string }>({
  title,
  crumb,
  summary,
  kpis,
  rows,
  columns,
  tabs = ["All"],
  tabKey = "status",
  storeKey,
  statusActions,
  detail,
}: {
  title: string;
  crumb?: string;
  summary: string;
  kpis: { label: string; value: number | string; delta?: string; tone?: "brand" | "green" | "amber" | "red" }[];
  rows: T[];
  columns: Column<T>[];
  tabs?: string[];
  tabKey?: keyof T | string;
  storeKey?: Parameters<ReturnType<typeof useAdmin>["patch"]>[0];
  statusActions?: string[];
  detail?: (row: T) => React.ReactNode;
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState(tabs[0] || "All");
  const [open, setOpen] = useState<T | null>(null);
  const [note, setNote] = useState("");
  const admin = useAdmin();

  const filtered = useMemo(() => {
    let list = rows;
    const role = params.get("role");
    const featured = params.get("featured");
    const kind = params.get("kind");
    const type = params.get("type");
    const verified = params.get("verified");
    const severity = params.get("severity");
    const q = params.get("q");
    if (role) list = list.filter((r) => String((r as Record<string, unknown>).role) === role);
    if (featured) list = list.filter((r) => Boolean((r as Record<string, unknown>).featured));
    if (kind) list = list.filter((r) => String((r as Record<string, unknown>).kind) === kind);
    if (type) list = list.filter((r) => String((r as Record<string, unknown>).type) === type);
    if (verified) list = list.filter((r) => Boolean((r as Record<string, unknown>).verified));
    if (severity) list = list.filter((r) => String((r as Record<string, unknown>).severity) === severity);
    if (params.get("status")) list = list.filter((r) => String(r.status) === params.get("status"));
    if (q) list = list.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
    if (tab !== "All") {
      const needle = tab.toLowerCase().replace(/\s+/g, "_");
      list = list.filter((r) => {
        const rec = r as Record<string, unknown>;
        return String(rec[String(tabKey)] || r.status || "").toLowerCase().replace(/\s+/g, "_") === needle;
      });
    }
    return list;
  }, [rows, params, tab, tabKey]);

  return (
    <>
      <PageHeader title={title} crumb={crumb} summary={summary} />
      <SummaryStrip items={kpis} />
      <DataTable
        rows={filtered}
        columns={columns}
        tabs={tabs}
        tab={tab}
        onTab={setTab}
        onRow={setOpen}
        onAction={setOpen}
      />
      <Drawer open={!!open} title={open ? String((open as Record<string, unknown>).title || (open as Record<string, unknown>).name || "Record") : ""} onClose={() => setOpen(null)}>
        {open ? (
          <div className="space-y-4 text-sm">
            {"name" in open && typeof (open as { name?: string }).name === "string" ? (
              <div className="flex items-center gap-3">
                <Avatar name={(open as { name: string }).name} id={open.id} size={48} />
                <div>
                  <p className="font-semibold text-ink">{(open as { name: string }).name}</p>
                  <StatusBadge status={String(open.status || "active")} />
                </div>
              </div>
            ) : (
              <StatusBadge status={String(open.status || "active")} />
            )}
            {detail ? detail(open) : (
              <pre className="overflow-auto rounded-xl bg-elevated p-3 text-[11px] text-muted">
                {JSON.stringify(open, null, 2)}
              </pre>
            )}
            {storeKey && statusActions?.length ? (
              <div className="space-y-2 border-t border-line pt-4">
                <p className="text-xs font-semibold text-muted">Moderation</p>
                <div className="flex flex-wrap gap-2">
                  {statusActions.map((s) => (
                    <Btn
                      key={s}
                      kind={s === "blocked" || s === "rejected" || s === "hidden" ? "danger" : "ghost"}
                      onClick={() => {
                        admin.patch(storeKey, open.id, { status: s });
                        admin.toast(`Updated to ${s}.`);
                        setOpen({ ...open, status: s } as T);
                      }}
                    >
                      {s}
                    </Btn>
                  ))}
                </div>
                <Field label="Internal note">
                  <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <Btn
                  onClick={() => {
                    admin.toast(note ? `Note saved: ${note.slice(0, 40)}` : "Status kept.");
                    setNote("");
                  }}
                >
                  Save note
                </Btn>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

export function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
