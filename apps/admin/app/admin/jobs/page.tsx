"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { Job } from "@/lib/demo-data";

export default function JobsPage() {
  const { jobs } = useAdmin();
  const columns: Column<Job>[] = [
    { key: "title", label: "Role", render: (j) => <span className="font-medium">{j.title}</span> },
    { key: "company", label: "By / Owner" },
    { key: "type", label: "Category" },
    { key: "location", label: "Location" },
    { key: "salary", label: "Salary" },
    { key: "applicants", label: "Applicants" },
    { key: "posted", label: "Time" },
    { key: "status", label: "Status", render: (j) => <StatusBadge status={j.status} /> },
  ];

  return (
    <ResourcePage
      title="Job Management"
      summary="12 employer posts from Lahan cashiers to Kathmandu React roles. Salary must stay in NPR. Ghost jobs and unpaid trial weeks get rejected from the drawer. Filter Full Time from the sidebar when reviewing the daily queue."
      kpis={[
        { label: "Open posts", value: jobs.length, tone: "brand" },
        { label: "Pending", value: jobs.filter((j) => j.status === "pending").length, tone: "amber" },
        { label: "Approved", value: jobs.filter((j) => j.status === "approved" || j.status === "active").length, tone: "green" },
        { label: "Applicants", value: jobs.reduce((s, j) => s + j.applicants, 0), tone: "brand" },
        { label: "Rejected", value: jobs.filter((j) => j.status === "rejected").length, tone: "red" },
      ]}
      rows={jobs}
      columns={columns}
      tabs={["All", "Pending", "Approved", "Active", "Rejected"]}
      storeKey="jobs"
      statusActions={["pending", "approved", "active", "rejected"]}
      detail={(j) => (
        <>
          <Kv label="Company" value={j.company} />
          <Kv label="Posted by" value={j.owner} />
          <Kv label="Type" value={j.type} />
          <Kv label="Location" value={j.location} />
          <Kv label="Salary" value={j.salary} />
          <Kv label="Applicants" value={j.applicants} />
        </>
      )}
    />
  );
}
