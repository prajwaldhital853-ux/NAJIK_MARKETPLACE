"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import type { Order } from "@/lib/demo-data";

export default function OrdersPage() {
  const { orders } = useAdmin();
  const columns: Column<Order>[] = [
    { key: "id", label: "Booking" },
    { key: "service", label: "Title / Name", render: (o) => <span className="font-medium">{o.service}</span> },
    { key: "buyer", label: "Buyer" },
    { key: "provider", label: "Provider" },
    { key: "city", label: "Location" },
    { key: "amount", label: "Amount", render: (o) => npr(o.amount), sortValue: (o) => o.amount },
    { key: "when", label: "Time" },
    { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <ResourcePage
      title="Orders & Bookings"
      summary="15 live service bookings — leaks in Kathmandu, a Pokhara wedding shoot, Lahan car wash. Move pending slots to active when the provider confirms, complete after payout, or cancel no-shows. Amounts feed the Payments page."
      kpis={[
        { label: "Bookings", value: orders.length, tone: "brand" },
        { label: "Pending", value: orders.filter((o) => o.status === "pending").length, tone: "amber" },
        { label: "In progress", value: orders.filter((o) => o.status === "active").length, tone: "brand" },
        { label: "Completed", value: orders.filter((o) => o.status === "completed").length, tone: "green" },
        { label: "GMV", value: npr(orders.reduce((s, o) => s + o.amount, 0)), tone: "green" },
      ]}
      rows={orders}
      columns={columns}
      tabs={["All", "Pending", "Active", "Completed", "Cancelled"]}
      storeKey="orders"
      statusActions={["pending", "active", "completed", "cancelled"]}
      detail={(o) => (
        <>
          <Kv label="Buyer" value={o.buyer} />
          <Kv label="Provider" value={o.provider} />
          <Kv label="City" value={o.city} />
          <Kv label="Slot" value={o.slot} />
          <Kv label="When" value={o.when} />
          <Kv label="Amount" value={npr(o.amount)} />
        </>
      )}
    />
  );
}
