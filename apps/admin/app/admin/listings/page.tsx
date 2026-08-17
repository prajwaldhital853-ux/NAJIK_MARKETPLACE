"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { OtherListing } from "@/lib/demo-data";

export default function ListingsPage() {
  const { others } = useAdmin();
  const columns: Column<OtherListing>[] = [
    { key: "title", label: "Title", render: (o) => <span className="font-medium">{o.title}</span> },
    { key: "kind", label: "Type" },
    { key: "seller", label: "By / Owner" },
    { key: "location", label: "Location" },
    { key: "price", label: "Price" },
    { key: "posted", label: "Time" },
    { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <ResourcePage
      title="Other Listings"
      summary="Vehicles, used furniture and neighbourhood shops that sit outside property/jobs/electronics. 12 demo rows. Sidebar filters split Creta/Pulsar, teak beds, and kirana storefronts. High-severity bike papers live in Reports — don’t approve a Pulsar with a mismatched engine number."
      kpis={[
        { label: "Other listings", value: others.length, tone: "brand" },
        { label: "Vehicles", value: others.filter((o) => o.kind === "vehicle").length, tone: "brand" },
        { label: "Used items", value: others.filter((o) => o.kind === "used").length, tone: "green" },
        { label: "Shops", value: others.filter((o) => o.kind === "shop").length, tone: "amber" },
        { label: "Pending", value: others.filter((o) => o.status === "pending").length, tone: "amber" },
      ]}
      rows={others}
      columns={columns}
      tabs={["All", "Pending", "Approved", "Active", "Rejected"]}
      storeKey="others"
      statusActions={["pending", "approved", "active", "rejected"]}
      detail={(o) => (
        <>
          <Kv label="Kind" value={o.kind} />
          <Kv label="Seller" value={o.seller} />
          <Kv label="Location" value={o.location} />
          <Kv label="Price" value={o.price} />
          <Kv label="Posted" value={o.posted} />
        </>
      )}
    />
  );
}
