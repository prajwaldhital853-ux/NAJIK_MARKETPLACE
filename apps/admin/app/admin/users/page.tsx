"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { Avatar, StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { User } from "@/lib/demo-data";

export default function UsersPage() {
  const { users } = useAdmin();
  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      render: (u) => (
        <span className="flex items-center gap-2">
          <Avatar name={u.name} id={u.id} size={28} />
          <span>
            <span className="block font-medium">{u.name}</span>
            <span className="text-[11px] text-muted">{u.email}</span>
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
    { key: "lastActive", label: "Last active" },
  ];

  return (
    <ResourcePage
      title="User Management"
      summary="Live app signups. Open a row to block, verify, or permanently delete the account and all of their listings."
      kpis={[
        { label: "Accounts", value: users.length, tone: "brand" },
        { label: "Active", value: users.filter((u) => u.status === "active" || u.status === "verified").length, tone: "green" },
        { label: "Pending", value: users.filter((u) => u.status === "pending").length, tone: "amber" },
        { label: "Blocked", value: users.filter((u) => u.status === "blocked").length, tone: "red" },
        { label: "KYC verified", value: users.filter((u) => u.kyc === "verified").length, tone: "green" },
      ]}
      rows={users}
      columns={columns}
      tabs={["All", "Active", "Pending", "Verified", "Blocked"]}
      storeKey="users"
      statusActions={["active", "deactivated", "blocked"]}
      allowDelete
      deleteConfirm="Delete this account and all of their listings? This cannot be undone."
      detail={(u) => (
        <>
          <Kv label="Email" value={u.email} />
          <Kv label="Phone" value={u.phone} />
          <Kv label="City" value={u.city} />
          <Kv label="Role" value={u.role} />
          <Kv label="Joined" value={u.joined} />
          <Kv label="Listings" value={u.listings} />
          <Kv label="KYC" value={u.kyc} />
        </>
      )}
    />
  );
}
