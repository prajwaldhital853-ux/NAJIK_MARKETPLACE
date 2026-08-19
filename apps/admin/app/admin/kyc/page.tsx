"use client";

import Link from "next/link";
import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { KycRow } from "@/lib/demo-data";

export default function KycPage() {
  const { kyc } = useAdmin();
  const columns: Column<KycRow>[] = [
    { key: "name", label: "Name", render: (k) => <span className="font-medium">{k.name}</span> },
    { key: "type", label: "Type" },
    { key: "doc", label: "Document" },
    { key: "city", label: "Location" },
    { key: "submitted", label: "Time" },
    { key: "status", label: "Status", render: (k) => <StatusBadge status={k.status} /> },
  ];

  return (
    <ResourcePage
      title="KYC / Verification"
      crumb="Dashboard / KYC / User documents"
      summary="User document packets for this session. Live seller apply-form submissions land on the provider queue."
      kpis={[
        { label: "Packets", value: kyc.length, tone: "brand" },
        { label: "Pending", value: kyc.filter((k) => k.status === "pending").length, delta: "SLA 24h", tone: "amber" },
        { label: "Verified", value: kyc.filter((k) => k.status === "verified").length, tone: "green" },
        { label: "Rejected", value: kyc.filter((k) => k.status === "rejected").length, tone: "red" },
        { label: "Providers in set", value: kyc.filter((k) => k.type === "provider").length, tone: "brand" },
      ]}
      rows={kyc}
      columns={columns}
      tabs={["All", "Pending", "Verified", "Rejected"]}
      storeKey="kyc"
      statusActions={["pending", "verified", "rejected"]}
      detail={(k) => (
        <>
          <Kv label="Email" value={k.email} />
          <Kv label="Type" value={k.type} />
          <Kv label="Document" value={k.doc} />
          <Kv label="City" value={k.city} />
          <Kv label="Submitted" value={k.submitted} />
          <Kv label="Notes" value={k.notes} />
          <p className="pt-2 text-xs text-muted">
            Mobile provider applications (photo + nagrita upload) are reviewed on{" "}
            <Link href="/admin/providers" className="font-semibold text-brand">
              /admin/providers
            </Link>
            .
          </p>
        </>
      )}
    />
  );
}
