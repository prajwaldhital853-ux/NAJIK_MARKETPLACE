"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { DataTable, type Column, type RowMenuAction } from "@/components/admin/table";
import { DetailKv, DetailOverlay } from "@/components/admin/detail-overlay";
import { userDocuments } from "@/components/admin/user-detail-drawer";
import { UserListingsPanel } from "@/components/admin/user-listings-panel";
import { Avatar, Btn, Field, StatusBadge, inputClass } from "@/components/admin/ui";
import { mapDirectoryUser } from "@/lib/live-users";
import { useSession } from "@/lib/session";
import { listAppUsersPage } from "@/lib/staff-api";
import { AdminUsageGuideButton } from "@/components/admin/admin-usage-guide";
import { formatRbacDeniedMessage, toastAdminError } from "@/lib/rbac";
import { usePageRbac } from "@/lib/use-page-rbac";
import { useAdmin } from "@/lib/store";
import type { User } from "@/lib/demo-data";

function roleFromParams(raw: string | null): "buyer" | "provider" | undefined {
  if (raw === "buyer" || raw === "user") return "buyer";
  if (raw === "provider" || raw === "seller") return "provider";
  return undefined;
}

export default function UsersPage() {
  const { apiSession, staff } = useSession();
  const { canUpdate, canDelete, readOnly } = usePageRbac("user_management");
  const admin = useAdmin();
  const { inboxReady } = admin;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchResults, setSearchResults] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get("q") || "");
  const [open, setOpen] = useState<User | null>(null);
  const [listingsUser, setListingsUser] = useState<User | null>(null);
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const autoOpenedId = useRef<string | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    note: "Sending…",
    active: "Activating…",
    deactivated: "Deactivating…",
    blocked: "Blocking…",
  };

  const role = roleFromParams(params.get("role"));
  const query = (params.get("q") || "").trim();
  const tab = params.get("status") || "all";
  const openId = params.get("id");

  // Use store data by default for instant load
  const storeUsers = admin.users;
  const displayUsers = searchResults || storeUsers;

  const writeParams = useCallback(
    (next: { role?: "buyer" | "provider" | null; q?: string; id?: string | null; status?: string }) => {
      const qs = new URLSearchParams(params.toString());

      if (next.role !== undefined) {
        if (next.role) qs.set("role", next.role);
        else qs.delete("role");
      }

      if (next.q !== undefined) {
        if (next.q.trim()) qs.set("q", next.q.trim());
        else qs.delete("q");
      }

      if (next.status !== undefined) {
        if (next.status && next.status !== "all") qs.set("status", next.status);
        else qs.delete("status");
      }

      if (next.id !== undefined) {
        if (next.id) qs.set("id", next.id);
        else qs.delete("id");
      }

      const suffix = qs.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Server-side search when user types (debounced)
  useEffect(() => {
    if (!query) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const id = window.setTimeout(async () => {
      try {
        const data = await listAppUsersPage({ q: query, page: 1, page_size: 100 });
        setSearchResults(data.results.map(mapDirectoryUser));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(id);
  }, [query]);

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Auto-open from inbox
  useEffect(() => {
    if (!openId) return;
    if (autoOpenedId.current === openId) return;
    const match = displayUsers.find((row) => row.id === openId);
    if (!match) return;
    autoOpenedId.current = openId;
    setOpen(match);
    admin.markInboxSeen(`user-${openId}`);
  }, [openId, displayUsers, admin]);

  useEffect(() => {
    setOpen((prev) => (prev ? displayUsers.find((row) => row.id === prev.id) || prev : prev));
  }, [displayUsers]);

  useEffect(() => {
    if (!open) {
      setNote("");
      return;
    }
    setNote(open.staff_warning || "");
  }, [open?.id]);

  function closeDrawer() {
    if (openId) autoOpenedId.current = openId;
    setOpen(null);
    writeParams({ id: null });
  }

  const filtered = useMemo(() => {
    let list = displayUsers;
    if (role) list = list.filter((u) => (role === "buyer" ? u.role === "buyer" : u.role === "provider"));
    if (tab && tab !== "all") {
      const needle = tab.toLowerCase().replace(/\s+/g, "_");
      list = list.filter((u) => u.status.toLowerCase().replace(/\s+/g, "_") === needle);
    }
    return list;
  }, [displayUsers, role, tab]);

  const kpis = useMemo(
    () => [
      { label: "Total", value: storeUsers.length, tone: "brand" as const },
      { label: "Showing", value: filtered.length, tone: "green" as const },
      {
        label: "Buyers",
        value: filtered.filter((u) => u.role === "buyer").length,
        tone: "amber" as const,
      },
      {
        label: "Sellers",
        value: filtered.filter((u) => u.role === "provider").length,
        tone: "green" as const,
      },
      { label: "Blocked", value: filtered.filter((u) => u.status === "blocked").length, tone: "red" as const },
    ],
    [filtered, storeUsers.length],
  );

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      render: (u) => (
        <span className="flex items-center gap-2">
          <Avatar name={u.name} id={u.id} size={28} />
          <span>
            <span className="block font-medium">{u.name}</span>
            <span className="text-[11px] text-muted">{u.email || u.phone}</span>
          </span>
        </span>
      ),
    },
    { key: "role", label: "Account" },
    { key: "category", label: "Segment" },
    { key: "city", label: "Location" },
    { key: "listings", label: "Listings" },
    { key: "kyc", label: "KYC", render: (u) => <StatusBadge status={u.kyc} /> },
    { key: "status", label: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "joined",
      label: "Joined",
      sortValue: (u) => Date.parse(u.joinedAt || "") || 0,
      render: (u) => <span className="text-muted">{u.joined}</span>,
    },
  ];

  const rowActions: RowMenuAction<User>[] = [
    ...(canDelete
      ? [
          {
            label: "Delete",
            danger: true,
            onClick: (row: User) => {
              if (!window.confirm("Delete this account and all of their listings? This cannot be undone.")) return;
              void admin
                .remove("users", row.id)
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
            onClick: (row: User) => {
              void admin
                .patch("users", row.id, { status: "blocked" })
                .then(() => admin.toast("Blocked."))
                .catch((err: unknown) => toastAdminError(admin.toast, err, "Could not block."));
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="User Management"
        crumb="Dashboard / Users"
        summary={`${storeUsers.length} live accounts. Search works across 10k+ users. Data refreshes automatically.`}
        extra={<AdminUsageGuideButton staff={staff} />}
      />
      <SummaryStrip items={kpis} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search size={14} className="absolute top-2.5 left-2.5 text-faint" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              const val = e.target.value.trim();
              if (!val) writeParams({ q: "" });
              else {
                const id = window.setTimeout(() => writeParams({ q: val }), 500);
                return () => window.clearTimeout(id);
              }
            }}
            placeholder="Search name, email, phone…"
            className="w-full rounded-lg border border-line bg-card py-2 pr-3 pl-8 text-sm text-ink outline-none"
          />
          {searching ? <span className="absolute top-2.5 right-2.5 text-xs text-muted">Searching...</span> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => writeParams({ role: null })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!role ? "bg-brand text-white" : "border border-line text-ink"}`}
          >
            All accounts
          </button>
          <button
            type="button"
            onClick={() => writeParams({ role: "buyer" })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${role === "buyer" ? "bg-brand text-white" : "border border-line text-ink"}`}
          >
            Buyers
          </button>
          <button
            type="button"
            onClick={() => writeParams({ role: "provider" })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${role === "provider" ? "bg-brand text-white" : "border border-line text-ink"}`}
          >
            Sellers
          </button>
        </div>
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        tabs={["All", "Active", "Pending", "Verified", "Blocked", "Deactivated"]}
        tab={tab === "all" || !tab ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
        onTab={(label) => writeParams({ status: label.toLowerCase() })}
        onRow={(row) => {
          setOpen(row);
          writeParams({ id: row.id });
          admin.markInboxSeen(`user-${row.id}`);
        }}
        rowActions={rowActions}
        hideSearch
        loading={!inboxReady || searching}
        loadingLabel={searching ? "Searching…" : "Loading users…"}
        emptyLabel="No users in this view."
      />

      <DetailOverlay
        open={!!open}
        title={open?.name || "User"}
        onClose={closeDrawer}
        details={
          open ? (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={open.name} id={open.id} size={44} />
                <div>
                  <p className="font-semibold text-ink">{open.name}</p>
                  <StatusBadge status={open.status} />
                </div>
              </div>
              <DetailKv label="Email" value={open.email} />
              <DetailKv label="Phone" value={open.phone} />
              <DetailKv label="City" value={open.city} />
              <DetailKv label="Role" value={open.role} />
              <DetailKv label="Joined" value={open.joined} />
              {open.role === "provider" ? <DetailKv label="Listings" value={open.listings} /> : null}
              {open.role === "provider" ? <DetailKv label="KYC" value={open.kyc} /> : null}
              {open.role === "provider" ? <DetailKv label="Segment" value={open.category} /> : null}
              <DetailKv label="Status" value={open.status} />
              {open.staff_warning ? <DetailKv label="Current note to user" value={open.staff_warning} /> : null}
            </div>
          ) : null
        }
        documents={open && open.role === "provider" ? userDocuments(open) : []}
        footer={
          open ? (
            <div className="space-y-3 text-sm">
              {readOnly ? (
                <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-xs text-muted">
                  View-only access — you cannot edit, block, or deactivate users.
                </p>
              ) : null}
              {open.role === "provider" ? (
                <Btn kind="primary" onClick={() => setListingsUser(open)}>
                  See all listings of this user
                </Btn>
              ) : null}
              {canUpdate ? (
                <>
                  <Field label="Note for user (shown in app)">
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write a note the user will see on Home and Profile"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
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
                          .patch("users", open.id, { staff_warning: note.trim(), notes: note.trim() })
                          .then(() => admin.toast("Note sent to user."))
                          .catch((err: unknown) => toastAdminError(admin.toast, err, "Could not send note."))
                          .finally(() => setBusyAction(null));
                      }}
                    >
                      Send note
                    </Btn>
                    {(["active", "deactivated", "blocked"] as const).map((s) => (
                      <Btn
                        key={s}
                        kind={s === "blocked" || s === "deactivated" ? "danger" : "ghost"}
                        loading={busyAction === s}
                        loadingLabel={STATUS_LABELS[s]}
                        disabled={!!busyAction}
                        onClick={() => {
                          const patchData = note.trim()
                            ? { status: s, staff_warning: note.trim(), notes: note.trim() }
                            : { status: s };
                          setBusyAction(s);
                          void admin
                            .patch("users", open.id, patchData)
                            .then(() => admin.toast(`${s.charAt(0).toUpperCase()}${s.slice(1)}.`))
                            .catch((err: unknown) => toastAdminError(admin.toast, err, "Could not update."))
                            .finally(() => setBusyAction(null));
                        }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Btn>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null
        }
      />

      {listingsUser ? (
        <UserListingsPanel
          userId={listingsUser.id}
          userName={listingsUser.name}
          onClose={() => setListingsUser(null)}
        />
      ) : null}
    </>
  );
}
