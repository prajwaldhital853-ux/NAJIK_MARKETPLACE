"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import type { Payment } from "@/lib/demo-data";

export default function PaymentsPage() {
  const { payments } = useAdmin();
  const columns: Column<Payment>[] = [
    { key: "ref", label: "Reference" },
    { key: "party", label: "Party" },
    { key: "type", label: "Type" },
    { key: "method", label: "Category" },
    { key: "amount", label: "Amount", render: (p) => npr(p.amount), sortValue: (p) => p.amount },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <ResourcePage
      title="Payments & Transactions"
      summary="15 eSewa, Khalti, IME Pay and bank rows: bookings, promo spend, provider payouts and refunds. Reconcile failed Khalti webhook TXN-88170 before Friday’s payout window. Pending promo for Kirana Store waits on seller KYC."
      kpis={[
        { label: "Transactions", value: payments.length, tone: "brand" },
        { label: "Completed", value: npr(payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0)), tone: "green" },
        { label: "Pending", value: npr(payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0)), tone: "amber" },
        { label: "Failed", value: payments.filter((p) => p.status === "failed").length, tone: "red" },
        { label: "Payouts", value: npr(payments.filter((p) => p.type === "payout").reduce((s, p) => s + p.amount, 0)), tone: "brand" },
      ]}
      rows={payments}
      columns={columns}
      tabs={["All", "Completed", "Pending", "Failed"]}
      storeKey="payments"
      statusActions={["pending", "completed", "failed"]}
      detail={(p) => (
        <>
          <Kv label="Reference" value={p.ref} />
          <Kv label="Party" value={p.party} />
          <Kv label="Method" value={p.method} />
          <Kv label="Type" value={p.type} />
          <Kv label="Amount" value={npr(p.amount)} />
          <Kv label="When" value={p.time} />
        </>
      )}
    />
  );
}
