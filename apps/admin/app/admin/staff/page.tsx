"use client";

import { useState, useEffect } from "react";
import { Shield, UserPlus, Key, Trash2, AlertTriangle, Check, X, Eye, EyeOff, Settings, Plus, Edit } from "lucide-react";
import {
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  resetStaffPassword,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  checkPasswordStrength,
  type StaffMember,
  type StaffRole,
  type Permission,
  type PermissionGroup,
  type PasswordStrength,
} from "@/lib/staff-api";

type Tab = "staff" | "roles";

export default function StaffManagementPage() {
  const [tab, setTab] = useState<Tab>("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Staff modals
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState<string | null>(null);
  
  // Role modals
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [staffData, rolesData, permsData] = await Promise.all([
        listStaffMembers(),
        listRoles(),
        listPermissions(),
      ]);
      setStaff(staffData);
      setRoles(rolesData);
      setPermissions(permsData.pages);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff(data: any) {
    try {
      await createStaffMember(data);
      await loadData();
      setShowCreateStaff(false);
    } catch (error: any) {
      alert(error.message || "Failed to create staff");
    }
  }

  async function handleUpdateStaff(staffId: string, updates: any) {
    try {
      await updateStaffMember(staffId, updates);
      await loadData();
      setSelectedStaff(null);
    } catch (error: any) {
      alert(error.message || "Failed to update staff");
    }
  }

  async function handleDeleteStaff(staffId: string) {
    try {
      await deleteStaffMember(staffId);
      await loadData();
      setConfirmDeleteStaff(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete staff");
    }
  }

  async function handleCreateRole(data: any) {
    try {
      await createRole(data);
      await loadData();
      setShowCreateRole(false);
    } catch (error: any) {
      alert(error.message || "Failed to create role");
    }
  }

  async function handleUpdateRole(roleId: string, updates: any) {
    try {
      await updateRole(roleId, updates);
      await loadData();
      setSelectedRole(null);
    } catch (error: any) {
      alert(error.message || "Failed to update role");
    }
  }

  async function handleDeleteRole(roleId: string) {
    try {
      await deleteRole(roleId);
      await loadData();
      setConfirmDeleteRole(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete role");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
          <p className="mt-4 text-ink-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink">Staff & Role Management</h1>
          <p className="mt-2 text-ink-secondary">Manage admin access and permissions</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-line">
          <button
            onClick={() => setTab("staff")}
            className={`border-b-2 px-4 py-2 font-medium transition ${
              tab === "staff"
                ? "border-brand text-brand"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            Staff Members
          </button>
          <button
            onClick={() => setTab("roles")}
            className={`border-b-2 px-4 py-2 font-medium transition ${
              tab === "roles"
                ? "border-brand text-brand"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            Roles & Permissions
          </button>
        </div>

        {/* Content */}
        {tab === "staff" ? (
          <StaffTab
            staff={staff}
            roles={roles}
            showCreateModal={showCreateStaff}
            selectedStaff={selectedStaff}
            confirmDelete={confirmDeleteStaff}
            onShowCreate={() => setShowCreateStaff(true)}
            onCloseCreate={() => setShowCreateStaff(false)}
            onCreateStaff={handleCreateStaff}
            onSelectStaff={setSelectedStaff}
            onCloseEdit={() => setSelectedStaff(null)}
            onUpdateStaff={handleUpdateStaff}
            onConfirmDelete={setConfirmDeleteStaff}
            onCancelDelete={() => setConfirmDeleteStaff(null)}
            onDeleteStaff={handleDeleteStaff}
          />
        ) : (
          <RolesTab
            roles={roles}
            permissions={permissions}
            showCreateModal={showCreateRole}
            selectedRole={selectedRole}
            confirmDelete={confirmDeleteRole}
            onShowCreate={() => setShowCreateRole(true)}
            onCloseCreate={() => setShowCreateRole(false)}
            onCreateRole={handleCreateRole}
            onSelectRole={setSelectedRole}
            onCloseEdit={() => setSelectedRole(null)}
            onUpdateRole={handleUpdateRole}
            onConfirmDelete={setConfirmDeleteRole}
            onCancelDelete={() => setConfirmDeleteRole(null)}
            onDeleteRole={handleDeleteRole}
          />
        )}
      </div>
    </div>
  );
}

// Staff Tab Component
function StaffTab({
  staff,
  roles,
  showCreateModal,
  selectedStaff,
  confirmDelete,
  onShowCreate,
  onCloseCreate,
  onCreateStaff,
  onSelectStaff,
  onCloseEdit,
  onUpdateStaff,
  onConfirmDelete,
  onCancelDelete,
  onDeleteStaff,
}: {
  staff: StaffMember[];
  roles: StaffRole[];
  showCreateModal: boolean;
  selectedStaff: StaffMember | null;
  confirmDelete: string | null;
  onShowCreate: () => void;
  onCloseCreate: () => void;
  onCreateStaff: (data: any) => Promise<void>;
  onSelectStaff: (staff: StaffMember) => void;
  onCloseEdit: () => void;
  onUpdateStaff: (id: string, data: any) => Promise<void>;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDeleteStaff: (id: string) => Promise<void>;
}) {
  return (
    <>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total Staff" value={staff.length} color="blue" />
        <StatCard label="Active" value={staff.filter((s) => s.is_active).length} color="green" />
        <StatCard
          label="Super Admins"
          value={staff.filter((s) => s.is_super_admin).length}
          color="purple"
        />
        <StatCard label="Locked" value={staff.filter((s) => s.is_locked).length} color="red" />
      </div>

      {/* Add Staff Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={onShowCreate}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-white hover:opacity-90"
        >
          <UserPlus className="h-5 w-5" />
          Add Staff
        </button>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                Staff
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-card">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <div className="font-medium text-ink">{member.full_name || member.email}</div>
                    <div className="text-sm text-ink-secondary">{member.email}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {member.is_super_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 px-3 py-1 text-xs font-semibold text-purple-800 dark:text-purple-200">
                      <Shield className="h-3 w-3" />
                      Super Admin
                    </span>
                  ) : member.role ? (
                    <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
                      {member.role.name}
                    </span>
                  ) : (
                    <span className="text-sm text-ink-secondary">No role</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {member.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
                        <X className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                    {member.is_locked && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Locked
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-ink-secondary">
                  {member.last_login
                    ? new Date(member.last_login).toLocaleString()
                    : "Never"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => onSelectStaff(member)}
                    className="text-brand hover:opacity-80 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onConfirmDelete(member.id)}
                    className="text-red-600 dark:text-red-400 hover:opacity-80"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateStaffModal roles={roles} onClose={onCloseCreate} onSubmit={onCreateStaff} />
      )}

      {selectedStaff && (
        <EditStaffModal
          staff={selectedStaff}
          roles={roles}
          onClose={onCloseEdit}
          onSubmit={(updates) => onUpdateStaff(selectedStaff.id, updates)}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          title="Delete Staff Member"
          message="This will deactivate the staff account. This action cannot be undone."
          onClose={onCancelDelete}
          onConfirm={() => onDeleteStaff(confirmDelete)}
        />
      )}
    </>
  );
}

// Roles Tab Component
function RolesTab({
  roles,
  permissions,
  showCreateModal,
  selectedRole,
  confirmDelete,
  onShowCreate,
  onCloseCreate,
  onCreateRole,
  onSelectRole,
  onCloseEdit,
  onUpdateRole,
  onConfirmDelete,
  onCancelDelete,
  onDeleteRole,
}: {
  roles: StaffRole[];
  permissions: PermissionGroup[];
  showCreateModal: boolean;
  selectedRole: StaffRole | null;
  confirmDelete: string | null;
  onShowCreate: () => void;
  onCloseCreate: () => void;
  onCreateRole: (data: any) => Promise<void>;
  onSelectRole: (role: StaffRole) => void;
  onCloseEdit: () => void;
  onUpdateRole: (id: string, data: any) => Promise<void>;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDeleteRole: (id: string) => Promise<void>;
}) {
  return (
    <>
      {/* Add Role Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={onShowCreate}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-white hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Create Custom Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-lg border border-line bg-card p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-ink">{role.name}</h3>
                  {role.is_system_role && (
                    <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                      System
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{role.description}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="text-ink-secondary">
                    {role.permission_ids?.length || 0} permissions
                  </span>
                  {role.staff_count !== undefined && (
                    <span className="text-ink-secondary">{role.staff_count} staff</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSelectRole(role)}
                  className="rounded p-1 text-brand hover:bg-muted"
                  title="Edit role"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {!role.is_system_role && (
                  <button
                    onClick={() => onConfirmDelete(role.id)}
                    className="rounded p-1 text-red-600 dark:text-red-400 hover:bg-muted"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateRoleModal
          permissions={permissions}
          onClose={onCloseCreate}
          onSubmit={onCreateRole}
        />
      )}

      {selectedRole && (
        <EditRoleModal
          role={selectedRole}
          permissions={permissions}
          onClose={onCloseEdit}
          onSubmit={(updates) => onUpdateRole(selectedRole.id, updates)}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          title="Delete Role"
          message="This role will be permanently deleted. Make sure no staff members are assigned to this role."
          onClose={onCancelDelete}
          onConfirm={() => onDeleteRole(confirmDelete)}
        />
      )}
    </>
  );
}

// Stats Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
    green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
  };

  return (
    <div className={`rounded-lg ${colors[color as keyof typeof colors]} p-4`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

// Create Staff Modal
function CreateStaffModal({
  roles,
  onClose,
  onSubmit,
}: {
  roles: StaffRole[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role_id: "",
    is_super_admin: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordChange(password: string) {
    setFormData({ ...formData, password });
    if (password.length >= 3) {
      try {
        const strength = await checkPasswordStrength(password);
        setPasswordStrength(strength);
      } catch (error) {
        console.error("Failed to check password:", error);
      }
    } else {
      setPasswordStrength(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-ink">Create New Staff</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="block w-full rounded-md border border-line bg-background px-3 py-2 pr-10 text-ink"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2.5 text-ink-secondary"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordStrength && <PasswordStrengthIndicator strength={passwordStrength} />}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_super_admin"
              checked={formData.is_super_admin}
              onChange={(e) => setFormData({ ...formData, is_super_admin: e.target.checked })}
              className="h-4 w-4 rounded border-line text-brand"
            />
            <label htmlFor="is_super_admin" className="ml-2 text-sm text-ink">
              Super Admin (Full Access)
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-line px-4 py-2 text-ink hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !passwordStrength?.valid}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Staff Modal
function EditStaffModal({
  staff,
  roles,
  onClose,
  onSubmit,
}: {
  staff: StaffMember;
  roles: StaffRole[];
  onClose: () => void;
  onSubmit: (updates: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    full_name: staff.full_name,
    role_id: staff.role?.id || "",
    is_active: staff.is_active,
    is_super_admin: staff.is_super_admin,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-ink">Edit Staff</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Email (read-only)</label>
            <input
              type="text"
              disabled
              value={staff.email}
              className="mt-1 block w-full rounded-md border border-line bg-muted px-3 py-2 text-ink-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            >
              <option value="">No role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-line text-brand"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-ink">
                Active
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_super_admin_edit"
                checked={formData.is_super_admin}
                onChange={(e) => setFormData({ ...formData, is_super_admin: e.target.checked })}
                className="h-4 w-4 rounded border-line text-brand"
              />
              <label htmlFor="is_super_admin_edit" className="ml-2 text-sm text-ink">
                Super Admin
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-line px-4 py-2 text-ink hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Continue in next message due to length...
// Create Role Modal with Permission Matrix
function CreateRoleModal({
  permissions,
  onClose,
  onSubmit,
}: {
  permissions: PermissionGroup[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permission_ids: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(permId: string) {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  }

  function togglePagePermissions(pagePerms: Permission[]) {
    const pageIds = pagePerms.map((p) => p.id);
    const allSelected = pageIds.every((id) => formData.permission_ids.includes(id));
    
    setFormData((prev) => ({
      ...prev,
      permission_ids: allSelected
        ? prev.permission_ids.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev.permission_ids, ...pageIds])],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-lg bg-card p-6 shadow-xl my-8">
        <h2 className="mb-4 text-xl font-bold text-ink">Create Custom Role</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Role Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Account Manager, Review Manager"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Description</label>
            <textarea
              rows={2}
              placeholder="Describe what this role does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Permissions ({formData.permission_ids.length} selected)
            </label>
            <div className="max-h-96 overflow-y-auto rounded-md border border-line bg-background p-4 space-y-4">
              {permissions.map((group) => (
                <div key={group.page} className="border-b border-line pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-ink">{group.page_display}</h4>
                    <button
                      type="button"
                      onClick={() => togglePagePermissions(group.permissions)}
                      className="text-xs text-brand hover:underline"
                    >
                      {group.permissions.every((p) => formData.permission_ids.includes(p.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 text-sm text-ink hover:bg-muted p-2 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permission_ids.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="h-4 w-4 rounded border-line text-brand"
                        />
                        <span>{perm.action_display}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-line px-4 py-2 text-ink hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Role Modal
function EditRoleModal({
  role,
  permissions,
  onClose,
  onSubmit,
}: {
  role: StaffRole;
  permissions: PermissionGroup[];
  onClose: () => void;
  onSubmit: (updates: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description,
    permission_ids: role.permission_ids || [],
    is_active: role.is_active,
  });
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(permId: string) {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  }

  function togglePagePermissions(pagePerms: Permission[]) {
    const pageIds = pagePerms.map((p) => p.id);
    const allSelected = pageIds.every((id) => formData.permission_ids.includes(id));
    
    setFormData((prev) => ({
      ...prev,
      permission_ids: allSelected
        ? prev.permission_ids.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev.permission_ids, ...pageIds])],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-lg bg-card p-6 shadow-xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ink">Edit Role: {role.name}</h2>
          {role.is_system_role && (
            <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-800 dark:text-blue-200">
              System Role
            </span>
          )}
        </div>
        {role.staff_count !== undefined && role.staff_count > 0 && (
          <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
            This role is assigned to {role.staff_count} staff member(s)
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Role Name</label>
            <input
              type="text"
              required
              disabled={role.is_system_role}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink disabled:bg-muted disabled:text-ink-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-line bg-background px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Permissions ({formData.permission_ids.length} selected)
            </label>
            <div className="max-h-96 overflow-y-auto rounded-md border border-line bg-background p-4 space-y-4">
              {permissions.map((group) => (
                <div key={group.page} className="border-b border-line pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-ink">{group.page_display}</h4>
                    <button
                      type="button"
                      onClick={() => togglePagePermissions(group.permissions)}
                      className="text-xs text-brand hover:underline"
                    >
                      {group.permissions.every((p) => formData.permission_ids.includes(p.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 text-sm text-ink hover:bg-muted p-2 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permission_ids.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="h-4 w-4 rounded border-line text-brand"
                        />
                        <span>{perm.action_display}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!role.is_system_role && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-line text-brand"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-ink">
                Active
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-line px-4 py-2 text-ink hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirm Delete Modal
function ConfirmDeleteModal({
  title,
  message,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">{title}</h3>
            <p className="text-sm text-ink-secondary">{message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-line px-4 py-2 text-ink hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {confirming ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Password Strength Indicator
function PasswordStrengthIndicator({ strength }: { strength: PasswordStrength }) {
  return (
    <div className="mt-2 space-y-1 text-xs">
      <div className="flex items-center gap-2">
        {strength.length ? (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-3 w-3 text-red-600 dark:text-red-400" />
        )}
        <span className={strength.length ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          At least 8 characters
        </span>
      </div>
      <div className="flex items-center gap-2">
        {strength.uppercase ? (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-3 w-3 text-red-600 dark:text-red-400" />
        )}
        <span className={strength.uppercase ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          1 uppercase letter
        </span>
      </div>
      <div className="flex items-center gap-2">
        {strength.lowercase ? (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-3 w-3 text-red-600 dark:text-red-400" />
        )}
        <span className={strength.lowercase ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          1 lowercase letter
        </span>
      </div>
      <div className="flex items-center gap-2">
        {strength.number ? (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-3 w-3 text-red-600 dark:text-red-400" />
        )}
        <span className={strength.number ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          1 number
        </span>
      </div>
      <div className="flex items-center gap-2">
        {strength.special ? (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-3 w-3 text-red-600 dark:text-red-400" />
        )}
        <span className={strength.special ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          1 special character (@$!%*?&)
        </span>
      </div>
    </div>
  );
}
