"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "./page-frame";
import { DataTable, type Column, type RowMenuAction } from "./table";
import { DetailKv, DetailOverlay } from "./detail-overlay";
import { Avatar, Btn, Field, StatusBadge, inputClass } from "./ui";
import { useAdmin } from "@/lib/store";

function tabFromStatus(status: string | null, tabs: string[]) {
  if (!status) return tabs[0] || "All";
  const match = tabs.find((t) => t.toLowerCase().replace(/\s+/g, "_") === status.toLowerCase().replace(/\s+/g, "_"));
  return match || tabs[0] || "All";
}

export function ResourcePage<T extends { id: string; status?: string; staff_warning?: string; notes?: string; rejection_note?: string }>({
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
  allowSendNote,
  detail,
  documents,
  detailFooterExtra,
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
  allowSendNote?: boolean;
  detail?: (row: T) => React.ReactNode;
  documents?: (row: T) => { label: string; src?: string | null }[];
  detailFooterExtra?: (row: T) => React.ReactNode;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const statusParam = params.get("status");
  const [tab, setTab] = useState(() => tabFromStatus(statusParam, tabs));
  const [open, setOpen] = useState<T | null>(null);
  const [note, setNote] = useState("");
  const admin = useAdmin();
  const openId = params.get("id");
  const autoOpenedId = useRef<string | null>(null);

  useEffect(() => {
    setTab(tabFromStatus(statusParam, tabs));
  }, [statusParam, tabs]);

  function setTabAndUrl(nextTab: string) {
    setTab(nextTab);
    const next = new URLSearchParams(params.toString());
    if (nextTab === "All") next.delete("status");
    else next.set("status", nextTab.toLowerCase().replace(/\s+/g, "_"));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

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

  useEffect(() => {
    if (!open) {
      setNote("");
      return;
    }
    const row = open as { notes?: string; rejection_note?: string; staff_warning?: string };
    setNote(String(row.staff_warning || row.notes || row.rejection_note || ""));
  }, [open?.id]);

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
    if (q) list = list.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
    // Status comes from the synced tab only (URL drives tab via useEffect).
    if (tab !== "All") {
      const needle = tab.toLowerCase().replace(/\s+/g, "_");
      list = list.filter((r) => {
        const rec = r as Record<string, unknown>;
        return String(rec[String(tabKey)] || r.status || "").toLowerCase().replace(/\s+/g, "_") === needle;
      });
    }
    return list;
  }, [rows, params, tab, tabKey]);

  const orderedIdsKey = `najik-admin-order:${storeKey || pathname}`;
  const [orderIds, setOrderIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(orderedIdsKey) || "[]") as string[];
    } catch {
      return [];
    }
  });

  const orderedRows = useMemo(() => {
    if (!orderIds.length) return filtered;
    const rank = new Map(orderIds.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return 0;
    });
  }, [filtered, orderIds]);

  function moveRow(row: T, direction: -1 | 1) {
    const ids = orderedRows.map((r) => r.id);
    const idx = ids.indexOf(row.id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrderIds(next);
    try {
      localStorage.setItem(orderedIdsKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const rowActions: RowMenuAction<T>[] = [
    {
      label: "Delete",
      danger: true,
      onClick: (row) => {
        if (!storeKey || !allowDelete) {
          admin.toast("Delete is not available here.");
          return;
        }
        const message = deleteConfirm || "Delete this record permanently? This cannot be undone.";
        if (!window.confirm(message)) return;
        void admin
          .remove(storeKey, row.id)
          .then(() => {
            admin.toast("Deleted.");
            if (open?.id === row.id) closeDrawer();
          })
          .catch((err: unknown) => admin.toast(err instanceof Error ? err.message : "Could not delete."));
      },
    },
    {
      label: "Block",
      danger: true,
      onClick: (row) => {
        if (!storeKey) {
          admin.toast("Block is not available here.");
          return;
        }
        void admin
          .patch(storeKey, row.id, { status: "blocked" })
          .then(() => admin.toast("Blocked."))
          .catch((err: unknown) => admin.toast(err instanceof Error ? err.message : "Could not block."));
      },
    },
    {
      label: "Move up",
      onClick: (row) => moveRow(row, -1),
    },
    {
      label: "Move down",
      onClick: (row) => moveRow(row, 1),
    },
  ];

  return (
    <>
      <PageHeader title={title} crumb={crumb} summary={summary} />
      <SummaryStrip items={kpis} />
      <DataTable
        rows={orderedRows}
        columns={columns}
        tabs={tabs}
        tab={tab}
        onTab={setTabAndUrl}
        onRow={(row) => {
          setOpen(row);
          if (storeKey === "users") admin.markInboxSeen(`user-${row.id}`);
        }}
        rowActions={rowActions}
      />
      <DetailOverlay
        open={!!open}
        title={open ? String((open as Record<string, unknown>).title || (open as Record<string, unknown>).name || "Record") : ""}
        onClose={closeDrawer}
        details={
          open ? (
            <div className="space-y-3 text-sm">
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
              {detail ? detail(open) : <DetailKv label="ID" value={open.id} />}
            </div>
          ) : null
        }
        documents={open && documents ? documents(open) : []}
        footer={
          open ? (
            <div className="space-y-3 text-sm">
              {detailFooterExtra ? detailFooterExtra(open) : null}
              {storeKey && statusActions?.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted">Moderation</p>
                  <Field label={storeKey === "kyc" ? "Rejection note for user" : allowSendNote ? "Note for user (shown in app)" : "Internal note"}>
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        storeKey === "kyc"
                          ? "Tell the user why this KYC was rejected (required to reject)"
                          : allowSendNote
                            ? "Write a note the user will see on Home and Profile"
                            : "Optional note"
                      }
                    />
                  </Field>
                  {allowSendNote && storeKey ? (
                    <div className="flex flex-wrap gap-2">
                      <Btn
                        kind="primary"
                        onClick={() => {
                          if (!note.trim()) {
                            admin.toast("Write a note before sending.");
                            return;
                          }
                          void admin
                            .patch(storeKey, open.id, { staff_warning: note.trim(), notes: note.trim() })
                            .then(() => {
                              admin.toast("Note sent to user.");
                              setOpen({ ...open, staff_warning: note.trim() } as T);
                            })
                            .catch((err: unknown) => {
                              admin.toast(err instanceof Error ? err.message : "Could not send note.");
                            });
                        }}
                      >
                        Send note to user
                      </Btn>
                      <Btn
                        kind="ghost"
                        onClick={() => {
                          void admin
                            .patch(storeKey, open.id, { staff_warning: "", notes: "" })
                            .then(() => {
                              admin.toast("Note cleared.");
                              setNote("");
                              setOpen({ ...open, staff_warning: "" } as T);
                            })
                            .catch((err: unknown) => {
                              admin.toast(err instanceof Error ? err.message : "Could not clear note.");
                            });
                        }}
                      >
                        Clear note
                      </Btn>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {statusActions.map((s) => (
                      <Btn
                        key={s}
                        kind={s === "blocked" || s === "deactivated" || s === "rejected" || s === "hidden" ? "danger" : "ghost"}
                        onClick={() => {
                          if (s === "rejected" && storeKey === "kyc" && !note.trim()) {
                            admin.toast("Add a rejection note before rejecting.");
                            return;
                          }
                          const patchData =
                            storeKey === "kyc" && s === "rejected"
                              ? { status: s, notes: note.trim() }
                              : storeKey === "kyc" && s === "pending"
                                ? { status: s, notes: "" }
                                : storeKey === "users" && note.trim()
                                  ? { status: s, staff_warning: note.trim(), notes: note.trim() }
                                  : { status: s };
                          void admin
                            .patch(storeKey, open.id, patchData)
                            .then(() => {
                              admin.toast(
                                s === "active"
                                  ? "Account is active."
                                  : s === "blocked"
                                    ? "Account blocked."
                                    : s === "deactivated"
                                      ? "Account deactivated."
                                      : s === "pending"
                                        ? "Reactivated to pending."
                                        : s === "rejected"
                                          ? "Rejected with note sent to user."
                                          : `Updated to ${s}.`,
                              );
                              setOpen({
                                ...open,
                                ...patchData,
                                status: s === "deactivated" ? "deactivated" : s,
                                ...(typeof patchData.staff_warning === "string"
                                  ? { staff_warning: patchData.staff_warning }
                                  : {}),
                              } as T);
                              if (s === "rejected" || s === "pending") setNote("");
                            })
                            .catch((err: unknown) => {
                              admin.toast(err instanceof Error ? err.message : "Could not update.");
                            });
                        }}
                      >
                        {s === "pending" ? "Reactivate" : s === "rejected" ? "Reject with note" : s}
                      </Btn>
                    ))}
                  </div>
                </div>
              ) : null}
              {storeKey && allowDelete ? (
                <Btn
                  kind="danger"
                  onClick={() => {
                    const message = deleteConfirm || "Delete this record permanently? This cannot be undone.";
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
              ) : null}
            </div>
          ) : null
        }
      />
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
