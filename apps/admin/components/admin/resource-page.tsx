"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  allowDelete,
  deleteConfirm,
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
  allowDelete?: boolean;
  deleteConfirm?: string;
  detail?: (row: T) => React.ReactNode;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState(tabs[0] || "All");
  const [open, setOpen] = useState<T | null>(null);
  const [note, setNote] = useState("");
  const admin = useAdmin();
  const openId = params.get("id");
  const autoOpenedId = useRef<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    if (autoOpenedId.current === openId) return;
    const match = rows.find((row) => row.id === openId);
    if (!match) return;
    autoOpenedId.current = openId;
    setOpen(match);
    if (storeKey === "users") admin.markInboxSeen(`user-${openId}`);
  }, [openId, rows, storeKey]);

  useEffect(() => {
    setOpen((prev) => {
      if (!prev) return prev;
      const next = rows.find((row) => row.id === prev.id);
      return next || prev;
    });
  }, [rows]);

  function closeDrawer() {
    if (openId) autoOpenedId.current = openId;
    setOpen(null);
    if (!params.get("id")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("id");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

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
        onRow={(row) => {
          setOpen(row);
          if (storeKey === "users") admin.markInboxSeen(`user-${row.id}`);
        }}
        onAction={(row) => {
          setOpen(row);
          if (storeKey === "users") admin.markInboxSeen(`user-${row.id}`);
        }}
      />
      <Drawer open={!!open} title={open ? String((open as Record<string, unknown>).title || (open as Record<string, unknown>).name || "Record") : ""} onClose={closeDrawer}>
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
                      kind={s === "blocked" || s === "deactivated" || s === "rejected" || s === "hidden" ? "danger" : "ghost"}
                      onClick={() => {
                        void admin
                          .patch(storeKey, open.id, { status: s })
                          .then(() => {
                            admin.toast(s === "active" ? "Account is active." : s === "blocked" ? "Account blocked." : s === "deactivated" ? "Account deactivated." : `Updated to ${s}.`);
                            setOpen({ ...open, status: s === "deactivated" ? "blocked" : s } as T);
                          })
                          .catch((err: unknown) => {
                            admin.toast(err instanceof Error ? err.message : "Could not update.");
                          });
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
            {storeKey && allowDelete ? (
              <div className="space-y-2 border-t border-line pt-4">
                <Btn
                  kind="danger"
                  onClick={() => {
                    const message =
                      deleteConfirm || "Delete this record permanently? This cannot be undone.";
                    if (!window.confirm(message)) return;
                    void admin
                      .remove(storeKey, open.id)
                      .then(() => {
                        admin.toast("Deleted.");
                        closeDrawer();
                      })
                      .catch((err: unknown) => {
                        admin.toast(err instanceof Error ? err.message : "Could not delete.");
                      });
                  }}
                >
                  Delete
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
