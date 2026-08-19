"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import type { Ad } from "@/lib/demo-data";

export default function AdsPage() {
  const { ads } = useAdmin();
  const columns: Column<Ad>[] = [
    { key: "name", label: "Campaign", render: (a) => <span className="font-medium">{a.name}</span> },
    { key: "advertiser", label: "By / Owner" },
    { key: "placement", label: "Category" },
    { key: "budget", label: "Budget", render: (a) => npr(a.budget), sortValue: (a) => a.budget },
    { key: "spent", label: "Spent", render: (a) => npr(a.spent), sortValue: (a) => a.spent },
    { key: "ctr", label: "CTR" },
    { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <ResourcePage
      title="Advertisements / Promotions"
      summary="Promoted campaigns. Pause overspend, approve pending ads after KYC, and keep featured inventory in check."
      kpis={[
        { label: "Campaigns", value: ads.length, tone: "brand" },
        { label: "Live", value: ads.filter((a) => a.status === "live").length, tone: "green" },
        { label: "Paused", value: ads.filter((a) => a.status === "paused").length, tone: "amber" },
        { label: "Budget", value: npr(ads.reduce((s, a) => s + a.budget, 0)), tone: "brand" },
        { label: "Spent", value: npr(ads.reduce((s, a) => s + a.spent, 0)), tone: "green" },
      ]}
      rows={ads}
      columns={columns}
      tabs={["All", "Live", "Paused", "Pending", "Ended"]}
      storeKey="ads"
      statusActions={["pending", "live", "paused", "ended"]}
      detail={(a) => (
        <>
          <Kv label="Advertiser" value={a.advertiser} />
          <Kv label="Placement" value={a.placement} />
          <Kv label="Dates" value={a.dates} />
          <Kv label="Budget" value={npr(a.budget)} />
          <Kv label="Spent" value={npr(a.spent)} />
          <Kv label="Remaining" value={npr(Math.max(0, a.budget - a.spent))} />
          <Kv label="CTR" value={a.ctr} />
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, (a.spent / Math.max(a.budget, 1)) * 100)}%` }} />
          </div>
        </>
      )}
    />
  );
}
