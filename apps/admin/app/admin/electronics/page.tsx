"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import type { Gadget } from "@/lib/demo-data";

export default function ElectronicsPage() {
  const { gadgets } = useAdmin();
  const columns: Column<Gadget>[] = [
    { key: "title", label: "Item", render: (g) => <span className="font-medium">{g.title}</span> },
    { key: "seller", label: "By / Owner" },
    { key: "brand", label: "Category" },
    { key: "location", label: "Location" },
    { key: "price", label: "Price", render: (g) => npr(g.price), sortValue: (g) => g.price },
    { key: "posted", label: "Time" },
    { key: "status", label: "Status", render: (g) => <StatusBadge status={g.status} /> },
  ];

  return (
    <ResourcePage
      title="Electronics Management"
      summary="12 gadget posts from iPhone 14 Pro Max to LG OLED. Check condition notes and IMEI stories in the drawer. Pending phones should not go live until the seller KYC is green. Baneshwor and Itahari see the most volume this window."
      kpis={[
        { label: "Gadgets", value: gadgets.length, tone: "brand" },
        { label: "Pending", value: gadgets.filter((g) => g.status === "pending").length, tone: "amber" },
        { label: "Approved / live", value: gadgets.filter((g) => g.status === "approved" || g.status === "active").length, tone: "green" },
        { label: "Ask (sum)", value: npr(gadgets.reduce((s, g) => s + g.price, 0)), tone: "brand" },
        { label: "Rejected", value: gadgets.filter((g) => g.status === "rejected").length, tone: "red" },
      ]}
      rows={gadgets}
      columns={columns}
      tabs={["All", "Pending", "Approved", "Active", "Rejected"]}
      storeKey="gadgets"
      statusActions={["pending", "approved", "active", "rejected"]}
      detail={(g) => (
        <>
          <Kv label="Seller" value={g.seller} />
          <Kv label="Brand" value={g.brand} />
          <Kv label="Condition" value={g.condition} />
          <Kv label="Location" value={g.location} />
          <Kv label="Price" value={npr(g.price)} />
          <Kv label="Posted" value={g.posted} />
        </>
      )}
    />
  );
}
