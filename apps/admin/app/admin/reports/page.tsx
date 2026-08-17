"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { Report } from "@/lib/demo-data";

export default function ReportsPage() {
  const { reports } = useAdmin();
  const columns: Column<Report>[] = [
    { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "reporter", label: "By / Owner" },
    { key: "category", label: "Category" },
    { key: "location", label: "Location" },
    { key: "severity", label: "Severity" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <ResourcePage
      title="Reports & Complaints"
      summary="12 trust & safety tickets. High severity: fake Chitwan farmhouse, stolen Pulsar, citizenship reuse, unpaid plumbing payout. Open the drawer for the reporter’s note, then mark under review or resolved. Sidebar High severity is the morning stand-up list."
      kpis={[
        { label: "Tickets", value: reports.length, tone: "brand" },
        { label: "Open", value: reports.filter((r) => r.status === "open").length, tone: "amber" },
        { label: "Under review", value: reports.filter((r) => r.status === "under_review").length, tone: "brand" },
        { label: "High severity", value: reports.filter((r) => r.severity === "high").length, tone: "red" },
        { label: "Resolved", value: reports.filter((r) => r.status === "resolved").length, tone: "green" },
      ]}
      rows={reports}
      columns={columns}
      tabs={["All", "Open", "Under review", "Resolved"]}
      tabKey="status"
      storeKey="reports"
      statusActions={["open", "under_review", "resolved"]}
      detail={(r) => (
        <>
          <Kv label="Reporter" value={r.reporter} />
          <Kv label="Against" value={r.against} />
          <Kv label="Category" value={r.category} />
          <Kv label="Location" value={r.location} />
          <Kv label="Severity" value={r.severity} />
          <p className="rounded-xl bg-elevated p-3 text-sm leading-relaxed text-ink">{r.detail}</p>
        </>
      )}
    />
  );
}
