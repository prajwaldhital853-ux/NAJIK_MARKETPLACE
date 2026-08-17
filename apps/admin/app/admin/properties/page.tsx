"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import type { Property } from "@/lib/demo-data";

export default function PropertiesPage() {
  const { properties } = useAdmin();
  const columns: Column<Property>[] = [
    { key: "title", label: "Title", render: (p) => <span className="font-medium">{p.title}</span> },
    { key: "owner", label: "Owner" },
    { key: "type", label: "Category" },
    { key: "location", label: "Location" },
    { key: "price", label: "Price", render: (p) => npr(p.price), sortValue: (p) => p.price },
    { key: "posted", label: "Time" },
    { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <ResourcePage
      title="Property Management"
      summary="16 Nepal listings from flats in Kathmandu to land in Lahan. Approve pending homes before they hit the buyer grid, feature valley inventory for Dashain, or reject documents that don’t match. Double-click a row for beds, baths, area and view counts."
      kpis={[
        { label: "Listings in queue", value: properties.length, tone: "brand" },
        { label: "Pending approval", value: properties.filter((p) => p.status === "pending").length, tone: "amber" },
        { label: "Featured", value: properties.filter((p) => p.featured).length, tone: "green" },
        { label: "Rejected / blocked", value: properties.filter((p) => p.status === "rejected" || p.status === "blocked").length, tone: "red" },
        { label: "Views (sum)", value: properties.reduce((s, p) => s + p.views, 0), tone: "brand" },
      ]}
      rows={properties}
      columns={columns}
      tabs={["All", "Pending", "Approved", "Active", "Rejected"]}
      storeKey="properties"
      statusActions={["pending", "approved", "active", "rejected", "blocked"]}
      detail={(p) => (
        <>
          <Kv label="Owner" value={p.owner} />
          <Kv label="Type" value={p.type} />
          <Kv label="Location" value={p.location} />
          <Kv label="Price" value={npr(p.price)} />
          <Kv label="Beds / baths" value={`${p.beds} / ${p.baths}`} />
          <Kv label="Area" value={p.area} />
          <Kv label="Featured" value={p.featured ? "Yes" : "No"} />
          <Kv label="Views" value={p.views} />
        </>
      )}
    />
  );
}
