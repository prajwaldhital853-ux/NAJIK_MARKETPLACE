"use client";

import { useState } from "react";
import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { UserListingsPanel } from "@/components/admin/user-listings-panel";
import { Avatar, Btn, StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { User } from "@/lib/demo-data";

export default function UsersPage() {
  const { users } = useAdmin();
  const [listingsUser, setListingsUser] = useState<User | null>(null);

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
    <>
      <ResourcePage
        title="User Management"
        summary="Live app signups. Open a row to send a note, deactivate, block, or permanently delete the account."
        kpis={[
          { label: "Accounts", value: users.length, tone: "brand" },
          { label: "Active", value: users.filter((u) => u.status === "active" || u.status === "verified").length, tone: "green" },
          { label: "Pending", value: users.filter((u) => u.status === "pending").length, tone: "amber" },
          { label: "Blocked", value: users.filter((u) => u.status === "blocked").length, tone: "red" },
          { label: "Deactivated", value: users.filter((u) => u.status === "deactivated").length, tone: "amber" },
          { label: "KYC verified", value: users.filter((u) => u.kyc === "verified").length, tone: "green" },
        ]}
        rows={users}
        columns={columns}
        tabs={["All", "Active", "Pending", "Verified", "Blocked", "Deactivated"]}
        storeKey="users"
        statusActions={["active", "deactivated", "blocked"]}
        allowDelete
        deleteConfirm="Delete this account and all of their listings? This cannot be undone."
        allowSendNote
        documents={(u) =>
          [
            { label: "Profile photo", src: u.photo_uri || u.avatar_uri },
            { label: "Citizenship front (Nagrita)", src: u.nagrita_uri },
            { label: "Citizenship back", src: u.nagrita_back_uri },
            { label: "Nation card", src: u.nation_card_uri },
            { label: "Other document", src: u.other_document_uri },
          ].filter((d) => d.src)
        }
        detail={(u) => (
          <>
            <Kv label="Email" value={u.email} />
            <Kv label="Phone" value={u.phone} />
            <Kv label="City" value={u.city} />
            <Kv label="Role" value={u.role} />
            <Kv label="Joined" value={u.joined} />
            <Kv label="Listings" value={u.listings} />
            <Kv label="KYC" value={u.kyc} />
            <Kv label="Status" value={u.status} />
            {u.staff_warning ? <Kv label="Current note to user" value={u.staff_warning} /> : null}
          </>
        )}
        detailFooterExtra={(u) => (
          <div className="pb-2">
            <Btn kind="primary" onClick={() => setListingsUser(u)}>
              See all listings of this user
            </Btn>
          </div>
        )}
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
