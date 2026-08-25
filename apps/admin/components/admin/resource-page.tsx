"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "./page-frame";
import { DataTable, type Column, type RowMenuAction } from "./table";
import { DetailKv, DetailOverlay } from "./detail-overlay";
import { Avatar, Btn, Field, StatusBadge, inputClass } from "./ui";
import { useAdmin } from "@/lib/store";
import { STORE_KEY_PAGE } from "@/lib/rbac";
import { toastAdminError } from "@/lib/rbac";
import { usePageRbac } from "@/lib/use-page-rbac";

function rowTimestamp(row: Record<string, unknown>): number {
  for (const key of ["joinedAt", "created_at", "posted", "date_joined", "at"]) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "number") return value;
    const parsed = Date.parse(String(value));
    if (parsed) return parsed;
  }
  return 0;
}

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
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const admin = useAdmin();
  const { inboxReady } = admin;
  const rbacPage = storeKey ? STORE_KEY_PAGE[storeKey] : undefined;
  const { canUpdate, canDelete, readOnly } = usePageRbac(rbacPage);
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

  const orderedRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const at = rowTimestamp(a as Record<string, unknown>);
      const bt = rowTimestamp(b as Record<string, unknown>);
      return bt - at;
    });
  }, [filtered]);

  const STATUS_LABELS: Record<string, string> = {
    note: "Sending…",
    clear: "Clearing…",
    delete: "Deleting…",
    active: "Activating…",
    blocked: "Blocking…",
    deactivated: "Deactivating…",
    rejected: "Rejecting…",
    pending: "Updating…",
    invited: "Updating…",
    disabled: "Updating…",
  };

  const rowActions: RowMenuAction<T>[] = [
    ...(canDelete && allowDelete
      ? [
          {
            label: "Delete",
            danger: true,
            onClick: (row: T) => {
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
                .catch((err: unknown) => toastAdminError(admin.toast, err, "Could not delete."));
            },
          },
        ]
      : []),
    ...(canUpdate
      ? [
          {
            label: "Block",
            danger: true,
            onClick: (row: T) => {
              if (!storeKey) {
                admin.toast("Block is not available here.");
                return;
              }
              void admin
                .patch(storeKey, row.id, { status: "blocked" })
                .then(() => admin.toast("Blocked."))
                .catch((err: unknown) => toastAdminError(admin.toast, err, "Could not block."));
            },
          },
        ]
      : []),
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
        loading={!inboxReady}
        loadingLabel="Loading…"
        emptyLabel="No records in this view."
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
              {readOnly ? (
                <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-xs text-muted">
                  View-only access — moderation actions are hidden.
                </p>
              ) : null}
              {storeKey && statusActions?.length && canUpdate ? (
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
                  <div className="flex flex-wrap items-center gap-2">
                    {allowSendNote && storeKey ? (
                      <>
                        <Btn
                          kind="primary"
                          loading={busyAction === "note"}
                          loadingLabel={STATUS_LABELS.note}
                          disabled={!!busyAction}
                          onClick={() => {
                            if (!note.trim()) {
                              admin.toast("Write a note before sending.");
                              return;
                            }
                            setBusyAction("note");
                            void admin
                              .patch(storeKey, open.id, { staff_warning: note.trim(), notes: note.trim() })
                              .then(() => {
                                admin.toast("Note sent to user.");
                                setOpen({ ...open, staff_warning: note.trim() } as T);
                              })
                              .catch((err: unknown) => {
                                toastAdminError(admin.toast, err, "Could not send note.");
                              })
                              .finally(() => setBusyAction(null));
                          }}
                        >
                          Send note
                        </Btn>
                        <Btn
                          kind="ghost"
                          loading={busyAction === "clear"}
                          loadingLabel={STATUS_LABELS.clear}
                          disabled={!!busyAction}
                          onClick={() => {
                            setBusyAction("clear");
                            void admin
                              .patch(storeKey, open.id, { staff_warning: "", notes: "" })
                              .then(() => {
                                admin.toast("Note cleared.");
                                setNote("");
                                setOpen({ ...open, staff_warning: "" } as T);
                              })
                              .catch((err: unknown) => {
                                toastAdminError(admin.toast, err, "Could not clear note.");
                              })
                              .finally(() => setBusyAction(null));
                          }}
                        >
                          Clear note
                        </Btn>
                      </>
                    ) : null}
                    {statusActions.map((s) => (
                      <Btn
                        key={s}
                        kind={s === "blocked" || s === "deactivated" || s === "rejected" || s === "hidden" ? "danger" : "ghost"}
                        loading={busyAction === s}
                        loadingLabel={STATUS_LABELS[s] || "Updating…"}
                        disabled={!!busyAction}
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
                          setBusyAction(s);
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
                              toastAdminError(admin.toast, err, "Could not update.");
                            })
                            .finally(() => setBusyAction(null));
                        }}
                      >
                        {s === "pending" ? "Reactivate" : s === "rejected" ? "Reject with note" : s}
                      </Btn>
                    ))}
                    {allowDelete && canDelete ? (
                      <Btn
                        kind="danger"
                        loading={busyAction === "delete"}
                        loadingLabel={STATUS_LABELS.delete}
                        disabled={!!busyAction}
                        onClick={() => {
                          const message = deleteConfirm || "Delete this record permanently? This cannot be undone.";
                          if (!window.confirm(message)) return;
                          setBusyAction("delete");
                          void admin
                            .remove(storeKey!, open.id)
                            .then(() => {
                              admin.toast("Deleted.");
                              closeDrawer();
                            })
                            .catch((err: unknown) => {
                              toastAdminError(admin.toast, err, "Could not delete.");
                            })
                            .finally(() => setBusyAction(null));
                        }}
                      >
                        Delete
                      </Btn>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {storeKey && allowDelete && canDelete && !statusActions?.length ? (
                <Btn
                  kind="danger"
                  loading={busyAction === "delete"}
                  loadingLabel={STATUS_LABELS.delete}
                  disabled={!!busyAction}
                  onClick={() => {
                    const message = deleteConfirm || "Delete this record permanently? This cannot be undone.";
                    if (!window.confirm(message)) return;
                    setBusyAction("delete");
                    void admin
                      .remove(storeKey, open.id)
                      .then(() => {
                        admin.toast("Deleted.");
                        closeDrawer();
                      })
                      .catch((err: unknown) => {
                        toastAdminError(admin.toast, err, "Could not delete.");
                      })
                      .finally(() => setBusyAction(null));
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
