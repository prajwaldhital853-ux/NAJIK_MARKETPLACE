"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { Service } from "@/lib/demo-data";

export default function ServicesPage() {
  const { services } = useAdmin();
  const columns: Column<Service>[] = [
    { key: "title", label: "Service", render: (s) => <span className="font-medium">{s.title}</span> },
    { key: "provider", label: "Provider" },
    { key: "category", label: "Category" },
    { key: "location", label: "Location" },
    { key: "rate", label: "Rate" },
    { key: "rating", label: "Rating" },
    { key: "jobs", label: "Jobs done" },
    { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <ResourcePage
      title="Service Management"
      summary="12 local services — plumbing, cleaning, tuition, catering, yoga. Providers cannot take new bookings until status is verified. Use the verified filter for the public marketplace set, and keep pending catering/AC installs in the KYC lane."
      kpis={[
        { label: "Services", value: services.length, tone: "brand" },
        { label: "Verified", value: services.filter((s) => s.verified || s.status === "verified").length, tone: "green" },
        { label: "Pending", value: services.filter((s) => s.status === "pending").length, tone: "amber" },
        { label: "Avg rating", value: (services.reduce((a, s) => a + s.rating, 0) / services.length).toFixed(1), tone: "brand" },
        { label: "Jobs fulfilled", value: services.reduce((a, s) => a + s.jobs, 0), tone: "green" },
      ]}
      rows={services}
      columns={columns}
      tabs={["All", "Pending", "Verified", "Active", "Rejected"]}
      storeKey="services"
      statusActions={["pending", "verified", "active", "rejected"]}
      detail={(s) => (
        <>
          <Kv label="Provider" value={s.provider} />
          <Kv label="Category" value={s.category} />
          <Kv label="Location" value={s.location} />
          <Kv label="Rate" value={s.rate} />
          <Kv label="Rating" value={s.rating} />
          <Kv label="Jobs done" value={s.jobs} />
          <Kv label="Badge" value={s.verified ? "Verified" : "Unverified"} />
        </>
      )}
    />
  );
}
