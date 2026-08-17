"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { Staff } from "@/lib/demo-data";

export default function StaffPage() {
  const { staff } = useAdmin();
  const columns: Column<Staff>[] = [
    { key: "name", label: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "city", label: "Location" },
    { key: "lastLogin", label: "Last login" },
    { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <ResourcePage
      title="Admin & Staff Management"
      summary="12 staff seats: Super Admin (admin@najik.com / najikadmin), ops, KYC, moderators, finance, support, ads, and regional desks for East and the Valley. Invite stays pending until first login. Disabled night-moderator can be reactivated from the drawer. Switch account from the top-right avatar."
      kpis={[
        { label: "Seats", value: staff.length, tone: "brand" },
        { label: "Active", value: staff.filter((s) => s.status === "active").length, tone: "green" },
        { label: "Invited", value: staff.filter((s) => s.status === "invited").length, tone: "amber" },
        { label: "Disabled", value: staff.filter((s) => s.status === "disabled").length, tone: "red" },
        { label: "Moderators", value: staff.filter((s) => s.roleKey === "moderator").length, tone: "brand" },
      ]}
      rows={staff}
      columns={columns}
      tabs={["All", "Active", "Invited", "Disabled"]}
      storeKey="staff"
      statusActions={["active", "invited", "disabled"]}
      detail={(s) => (
        <>
          <Kv label="Email" value={s.email} />
          <Kv label="Role" value={s.role} />
          <Kv label="Desk" value={s.roleKey} />
          <Kv label="City" value={s.city} />
          <Kv label="Last login" value={s.lastLogin} />
          <Kv label="Demo password" value={s.password} />
        </>
      )}
    />
  );
}
