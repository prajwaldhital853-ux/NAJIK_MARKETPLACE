"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { PageHeader, SummaryStrip, AdminLoadingState } from "@/components/admin/page-frame";
import { DataTable, type Column, type RowMenuAction } from "@/components/admin/table";
import { Avatar, Btn, Drawer, Field, Modal, StatusBadge, inputClass } from "@/components/admin/ui";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import {
  checkPasswordStrength,
  createRole,
  createStaffMember,
  deleteRole,
  deleteStaffMember,
  listPermissions,
  listRoles,
  listStaffMembers,
  resetStaffPassword,
  updateRole,
  updateStaffMember,
  type PasswordStrength,
  type Permission,
  type PermissionGroup,
  type StaffMember,
  type StaffRole,
} from "@/lib/staff-api";

type HubTab = "staff" | "roles";

const ACTION_STYLES: Record<string, { on: string; off: string }> = {
  view: { on: "border-brand bg-brand-soft text-brand", off: "border-line bg-card text-muted hover:bg-elevated" },
  create: { on: "border-green/40 bg-green-soft text-green", off: "border-line bg-card text-muted hover:bg-elevated" },
  update: { on: "border-amber/40 bg-amber-soft text-amber", off: "border-line bg-card text-muted hover:bg-elevated" },
  delete: { on: "border-red/40 bg-red-soft text-red", off: "border-line bg-card text-muted hover:bg-elevated" },
};

function formatWhen(value: string | null) {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function PasswordStrengthList({ strength }: { strength: PasswordStrength | null }) {
  if (!strength) return null;
  const items = [
    { ok: strength.length, label: "At least 8 characters" },
    { ok: strength.uppercase, label: "1 uppercase letter" },
    { ok: strength.lowercase, label: "1 lowercase letter" },
    { ok: strength.number, label: "1 number" },
    { ok: strength.special, label: "1 special character (@$!%*?&)" },
  ];
  return (
    <div className="mt-2 space-y-1 rounded border border-line bg-elevated/50 p-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-[11px]">
          {item.ok ? <Check size={12} className="text-green" /> : <X size={12} className="text-red" />}
          <span className={item.ok ? "text-green" : "text-muted"}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function PermissionMatrix({
  groups,
  selected,
  onChange,
  compact,
}: {
  groups: PermissionGroup[];
  selected: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            g.page_display.toLowerCase().includes(needle) ||
            p.action_display.toLowerCase().includes(needle) ||
            p.code.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [groups, query]);

  const total = groups.reduce((n, g) => n + g.permissions.length, 0);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  function togglePage(perms: Permission[]) {
    const ids = perms.map((p) => p.id);
    const allOn = ids.every((id) => selected.includes(id));
    onChange(allOn ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  }

  function setPreset(mode: "view" | "full" | "none") {
    if (mode === "none") {
      onChange([]);
      return;
    }
    const ids: string[] = [];
    for (const group of groups) {
      for (const perm of group.permissions) {
        if (mode === "view" && perm.action === "view") ids.push(perm.id);
        if (mode === "full") ids.push(perm.id);
      }
    }
    onChange(ids);
  }

  if (!groups.length) {
    return (
      <div className="rounded border border-dashed border-line bg-elevated/40 px-4 py-8 text-center text-sm text-muted">
        No permissions loaded. Refresh the page — default roles and permissions will auto-initialize.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages or actions…"
            className={`${inputClass} pl-8`}
          />
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
          {selected.length}/{total} selected
        </span>
        <Btn kind="ghost" onClick={() => setPreset("view")}>View only</Btn>
        <Btn kind="ghost" onClick={() => setPreset("full")}>Select all</Btn>
        <Btn kind="ghost" onClick={() => setPreset("none")}>Clear</Btn>
      </div>

      <div className={`space-y-2 ${compact ? "max-h-72" : "max-h-[420px]"} overflow-y-auto admin-scroll pr-1`}>
        {filtered.map((group) => {
          const open = expanded[group.page] ?? query.length > 0;
          const pageIds = group.permissions.map((p) => p.id);
          const selectedCount = pageIds.filter((id) => selected.includes(id)).length;
          const allSelected = selectedCount === pageIds.length && pageIds.length > 0;

          return (
            <div key={group.page} className="overflow-hidden rounded border border-line bg-card">
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [group.page]: !open }))}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-elevated/60"
              >
                {open ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                <span className="flex-1 text-[13px] font-semibold text-ink">{group.page_display}</span>
                <span className="text-[11px] text-muted">{selectedCount}/{pageIds.length}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePage(group.permissions);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePage(group.permissions);
                    }
                  }}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold text-brand hover:bg-brand-soft"
                >
                  {allSelected ? "Deselect" : "Select all"}
                </span>
              </button>
              {open ? (
                <div className="grid gap-2 border-t border-line px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
                  {group.permissions.map((perm) => {
                    const on = selected.includes(perm.id);
                    const style = ACTION_STYLES[perm.action] || ACTION_STYLES.view;
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => toggle(perm.id)}
                        className={`rounded-lg border px-2.5 py-2 text-left text-[12px] font-semibold transition ${on ? style.on : style.off}`}
                      >
                        {perm.action_display}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: StaffRole;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const count = role.permission_ids?.length ?? role.permissions?.length ?? 0;
  return (
    <div className="group rounded border border-line bg-card p-3 transition hover:border-brand/40 hover:bg-elevated/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-[13px] font-semibold text-ink">{role.name}</h3>
            {role.is_system_role ? (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">Default</span>
            ) : (
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-muted">Custom</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{role.description || "No description"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
            <span>{count} permissions</span>
            {role.staff_count !== undefined ? <span>{role.staff_count} staff assigned</span> : null}
          </div>
        </div>
        <Shield size={16} className="shrink-0 text-brand/70" />
      </div>
      <div className="mt-3 flex gap-2">
        <Btn kind="ghost" onClick={onEdit}>Edit permissions</Btn>
        {!role.is_system_role && onDelete ? (
          <Btn kind="danger" onClick={onDelete}>Delete</Btn>
        ) : null}
      </div>
    </div>
  );
}

export function StaffManagementHub() {
  const admin = useAdmin();
  const { staff: sessionStaff } = useSession();
  const toastRef = useRef(admin.toast);
  toastRef.current = admin.toast;
  const isSuperAdmin = Boolean(sessionStaff?.isSuperAdmin);
  const [tab, setTab] = useState<HubTab>("staff");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionGroup[]>([]);

  const [staffDrawer, setStaffDrawer] = useState<"create" | StaffMember | null>(null);
  const [staffStep, setStaffStep] = useState(0);
  const [roleEditor, setRoleEditor] = useState<StaffRole | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "staff" | "role"; id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [staffData, rolesData, permsData] = await Promise.all([
        listStaffMembers(),
        listRoles(),
        listPermissions(),
      ]);
      setStaff(staffData);
      setRoles(rolesData);
      setPermissions(permsData.pages);
    } catch (err) {
      toastRef.current(err instanceof Error ? err.message : "Failed to load staff data");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const systemRoles = useMemo(() => roles.filter((r) => r.is_system_role), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.is_system_role), [roles]);

  const staffColumns: Column<StaffMember>[] = [
    {
      key: "name",
      label: "Staff",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.full_name || row.email} id={row.id} size={30} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.full_name || "—"}</p>
            <p className="truncate text-[11px] text-muted">{row.email}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.full_name || row.email,
    },
    {
      key: "role",
      label: "Role",
      render: (row) =>
        row.is_super_admin ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
            <ShieldCheck size={12} /> Super Admin
          </span>
        ) : row.role ? (
          <StatusBadge status={row.role.name} />
        ) : (
          <span className="text-[11px] text-muted">No role</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.is_active ? "active" : "deactivated"} />
          {row.is_locked ? <StatusBadge status="danger" /> : null}
          {row.must_change_password ? <span className="text-[10px] text-amber">Must reset password</span> : null}
        </div>
      ),
    },
    {
      key: "last_login",
      label: "Last login",
      render: (row) => <span className="text-[12px] text-muted">{formatWhen(row.last_login)}</span>,
      sortValue: (row) => row.last_login || "",
    },
  ];

  const staffRowActions: RowMenuAction<StaffMember>[] = [
    { label: "Edit access", onClick: (row) => { setStaffStep(1); setStaffDrawer(row); } },
    { label: "View details", onClick: (row) => { setStaffStep(0); setStaffDrawer(row); } },
    { label: "Remove staff", onClick: (row) => setConfirmDelete({ type: "staff", id: row.id, label: row.email }), danger: true },
  ];

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      if (confirmDelete.type === "staff") await deleteStaffMember(confirmDelete.id);
      else await deleteRole(confirmDelete.id);
      admin.toast(confirmDelete.type === "staff" ? "Staff deactivated" : "Role deleted");
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      admin.toast(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AdminLoadingState label="Loading staff & roles…" />;

  if (!isSuperAdmin) {
    return (
      <>
        <PageHeader
          title="Admin & Staff"
          crumb="Dashboard / Staff"
          summary="Staff and role management is limited to Super Admin accounts."
        />
        <div className="rounded border border-line bg-card px-4 py-10 text-center text-sm text-muted">
          You can see this menu item with staff permission, but only Super Admin can manage accounts and roles.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin & Staff"
        crumb="Dashboard / Staff"
        summary="Manage staff accounts, default system roles, and custom roles. Super Admin can edit permissions on any role and add new roles like Account Manager."
        extra={
          tab === "staff" ? (
            <Btn onClick={() => { setStaffStep(0); setStaffDrawer("create"); }}>
              <UserPlus size={14} /> Add staff
            </Btn>
          ) : (
            <Btn onClick={() => setRoleEditor("new")}>
              <Plus size={14} /> Custom role
            </Btn>
          )
        }
      />

      <SummaryStrip
        items={[
          { label: "Total staff", value: staff.length, tone: "brand" },
          { label: "Active", value: staff.filter((s) => s.is_active).length, tone: "green" },
          { label: "Default roles", value: systemRoles.length, tone: "brand" },
          { label: "Custom roles", value: customRoles.length, tone: "amber" },
          { label: "Locked accounts", value: staff.filter((s) => s.is_locked).length, tone: "red" },
        ]}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {([
          ["staff", "Staff members"],
          ["roles", "Roles & permissions"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${
              tab === id ? "border-brand bg-brand-soft text-brand" : "border-line bg-card text-ink hover:bg-elevated"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "staff" ? (
        <DataTable
          rows={staff}
          columns={staffColumns}
          rowActions={staffRowActions}
          searchPlaceholder="Search staff by name or email…"
          emptyLabel="No staff yet. Add your first team member."
          onRow={(row) => { setStaffStep(0); setStaffDrawer(row); }}
        />
      ) : (
        <div className="space-y-4">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Default system roles</h2>
                <p className="text-[11px] text-muted">Pre-configured roles with auto permissions. Super Admin can edit any permission.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {systemRoles.map((role) => (
                <RoleCard key={role.id} role={role} onEdit={() => setRoleEditor(role)} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2">
              <h2 className="text-[13px] font-semibold text-ink">Custom roles</h2>
              <p className="text-[11px] text-muted">Create extra roles like Account Manager with hand-picked page access.</p>
            </div>
            {customRoles.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {customRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={() => setRoleEditor(role)}
                    onDelete={() => setConfirmDelete({ type: "role", id: role.id, label: role.name })}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-line bg-card px-4 py-8 text-center">
                <p className="text-sm text-muted">No custom roles yet.</p>
                <div className="mt-3">
                  <Btn onClick={() => setRoleEditor("new")}>
                    <Plus size={14} /> Create Account Manager role
                  </Btn>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <StaffAccessDrawer
        open={staffDrawer !== null}
        mode={staffDrawer === "create" ? "create" : "edit"}
        staff={typeof staffDrawer === "object" ? staffDrawer : null}
        roles={roles.filter((r) => r.name !== "Super Admin")}
        step={staffStep}
        onStep={setStaffStep}
        onClose={() => setStaffDrawer(null)}
        onSaved={async () => {
          setStaffDrawer(null);
          admin.toast("Staff saved");
          await loadData();
        }}
      />

      <RoleEditorModal
        open={roleEditor !== null}
        role={roleEditor === "new" ? null : roleEditor}
        permissions={permissions}
        onClose={() => setRoleEditor(null)}
        onSaved={async () => {
          setRoleEditor(null);
          admin.toast("Role saved");
          await loadData();
        }}
      />

      <Modal open={!!confirmDelete} title="Confirm action" onClose={() => setConfirmDelete(null)}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-soft text-red">
            <AlertTriangle size={18} />
          </span>
          <div>
            <p className="text-sm text-ink">
              {confirmDelete?.type === "staff"
                ? `Deactivate ${confirmDelete.label}? They will lose admin access immediately.`
                : `Delete role "${confirmDelete?.label}"? Make sure no staff are assigned.`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn kind="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn kind="danger" loading={busy} onClick={() => void handleDelete()}>Confirm</Btn>
        </div>
      </Modal>
    </>
  );
}

function StaffAccessDrawer({
  open,
  mode,
  staff,
  roles,
  step,
  onStep,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  staff: StaffMember | null;
  roles: StaffRole[];
  step: number;
  onStep: (n: number) => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role_id: "",
    is_super_admin: false,
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && staff) {
      setForm({
        email: staff.email,
        full_name: staff.full_name,
        password: "",
        role_id: staff.role?.id || "",
        is_super_admin: staff.is_super_admin,
        is_active: staff.is_active,
      });
    } else {
      setForm({ email: "", full_name: "", password: "", role_id: "", is_super_admin: false, is_active: true });
    }
    setPasswordStrength(null);
    setResetPassword("");
    onStep(0);
  }, [open, mode, staff, onStep]);

  const selectedRole = roles.find((r) => r.id === form.role_id);

  async function checkStrength(password: string) {
    setForm((f) => ({ ...f, password }));
    if (password.length < 3) {
      setPasswordStrength(null);
      return;
    }
    try {
      setPasswordStrength(await checkPasswordStrength(password));
    } catch {
      setPasswordStrength(null);
    }
  }

  async function submitCreate() {
    setBusy(true);
    try {
      await createStaffMember({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        role_id: form.is_super_admin ? undefined : form.role_id || undefined,
        is_super_admin: form.is_super_admin,
      });
      await onSaved();
    } catch (err) {
      admin.toast(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!staff) return;
    setBusy(true);
    try {
      await updateStaffMember(staff.id, {
        full_name: form.full_name,
        role_id: form.is_super_admin ? null : form.role_id || null,
        is_super_admin: form.is_super_admin,
        is_active: form.is_active,
      });
      if (resetPassword) {
        await resetStaffPassword(staff.id, resetPassword);
      }
      await onSaved();
    } catch (err) {
      admin.toast(err instanceof Error ? err.message : "Failed to update staff");
    } finally {
      setBusy(false);
    }
  }

  const steps = mode === "create" ? ["Account", "Access", "Review"] : ["Details", "Access"];

  return (
    <Drawer open={open} title={mode === "create" ? "Add staff member" : `Edit — ${staff?.email}`} onClose={onClose}>
      <div className="mb-4 flex gap-2">
        {steps.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => onStep(idx)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
              step === idx ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"
            }`}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      {mode === "create" && step === 0 ? (
        <div className="space-y-3">
          <Field label="Work email">
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@najik.com" />
          </Field>
          <Field label="Full name">
            <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
          </Field>
          <Field label="Temporary password">
            <div className="relative">
              <input
                className={`${inputClass} pr-9`}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => void checkStrength(e.target.value)}
                placeholder="Staff will change on first login"
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthList strength={passwordStrength} />
          </Field>
          <Btn onClick={() => onStep(1)} disabled={!form.email || !form.full_name || !passwordStrength?.valid}>Next: choose access</Btn>
        </div>
      ) : null}

      {(mode === "create" && step === 1) || (mode === "edit" && step === 1) || (mode === "edit" && step === 0) ? (
        <div className="space-y-3">
          {mode === "edit" && step === 0 ? (
            <>
              <Field label="Email">
                <input className={`${inputClass} opacity-70`} disabled value={form.email} />
              </Field>
              <Field label="Full name">
                <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <label className="flex items-center justify-between rounded border border-line bg-elevated/40 px-3 py-2 text-sm">
                <span className="text-ink">Account active</span>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              </label>
              <Field label="Reset password (optional)">
                <input className={inputClass} type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Leave blank to keep current" />
              </Field>
              {mode === "edit" ? <Btn onClick={() => onStep(1)}>Next: access & role</Btn> : null}
            </>
          ) : (
            <>
              <label className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition ${form.is_super_admin ? "border-brand bg-brand-soft/40" : "border-line hover:bg-elevated/40"}`}>
                <input type="radio" checked={form.is_super_admin} onChange={() => setForm({ ...form, is_super_admin: true, role_id: "" })} className="mt-1" />
                <div>
                  <p className="flex items-center gap-1 text-[13px] font-semibold text-ink"><ShieldCheck size={14} /> Super Admin</p>
                  <p className="mt-0.5 text-[11px] text-muted">Full access to everything including staff management.</p>
                </div>
              </label>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Or assign a role</p>
              <div className="max-h-64 space-y-2 overflow-y-auto admin-scroll">
                {roles.map((role) => {
                  const active = !form.is_super_admin && form.role_id === role.id;
                  const permCount = role.permission_ids?.length ?? 0;
                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition ${active ? "border-brand bg-brand-soft/40" : "border-line hover:bg-elevated/40"}`}
                    >
                      <input
                        type="radio"
                        checked={active}
                        onChange={() => setForm({ ...form, is_super_admin: false, role_id: role.id })}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">{role.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted">{role.description}</p>
                        <p className="mt-1 text-[10px] text-brand">{permCount} permissions</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {mode === "create" ? (
                <Btn onClick={() => onStep(2)} disabled={!form.is_super_admin && !form.role_id}>Next: review</Btn>
              ) : (
                <Btn loading={busy} onClick={() => void submitEdit()}>Save changes</Btn>
              )}
            </>
          )}
        </div>
      ) : null}

      {mode === "create" && step === 2 ? (
        <div className="space-y-3">
          <div className="rounded border border-line bg-elevated/30 p-3 text-[12px]">
            <p><span className="text-muted">Email:</span> {form.email}</p>
            <p className="mt-1"><span className="text-muted">Name:</span> {form.full_name}</p>
            <p className="mt-1">
              <span className="text-muted">Access:</span>{" "}
              {form.is_super_admin ? "Super Admin (full access)" : selectedRole?.name || "—"}
            </p>
            {selectedRole && !form.is_super_admin ? (
              <p className="mt-1 text-[11px] text-muted">{selectedRole.permission_ids?.length ?? 0} page permissions will apply.</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Btn kind="ghost" onClick={() => onStep(1)}>Back</Btn>
            <Btn loading={busy} onClick={() => void submitCreate()}><UserPlus size={14} /> Create staff</Btn>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function RoleEditorModal({
  open,
  role,
  permissions,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: StaffRole | null;
  permissions: PermissionGroup[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(role?.name || "");
    setDescription(role?.description || "");
    setPermissionIds(role?.permission_ids || []);
  }, [open, role]);

  async function save() {
    setBusy(true);
    try {
      if (role) {
        await updateRole(role.id, {
          name: role.is_system_role ? undefined : name,
          description,
          permission_ids: permissionIds,
        });
      } else {
        await createRole({ name, description, permission_ids: permissionIds });
      }
      await onSaved();
    } catch (err) {
      admin.toast(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      xl
      title={role ? `Edit role — ${role.name}` : "Create custom role"}
      onClose={onClose}
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {role?.is_system_role ? (
            <div className="rounded border border-brand/30 bg-brand-soft/30 p-3 text-[11px] text-brand">
              <Shield size={14} className="mb-1 inline" /> Default system role — name is locked, but Super Admin can edit all permissions.
            </div>
          ) : null}
          <Field label="Role name">
            <input
              className={inputClass}
              value={name}
              disabled={!!role?.is_system_role}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account Manager"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What can this role do?"
            />
          </Field>
          {role?.staff_count ? (
            <p className="text-[11px] text-amber">{role.staff_count} staff currently use this role.</p>
          ) : null}
        </div>
        <div>
          <p className="mb-2 text-[12px] font-semibold text-ink">Page permissions</p>
          <PermissionMatrix groups={permissions} selected={permissionIds} onChange={setPermissionIds} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn loading={busy} disabled={!role?.is_system_role && !name.trim()} onClick={() => void save()}>
          {role ? "Save permissions" : "Create role"}
        </Btn>
      </div>
    </Modal>
  );
}
