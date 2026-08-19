"use client";

import { ResourcePage, Kv } from "@/components/admin/resource-page";
import { StatusBadge } from "@/components/admin/ui";
import type { Column } from "@/components/admin/table";
import { useAdmin } from "@/lib/store";
import type { Review } from "@/lib/demo-data";

export default function ReviewsPage() {
  const { reviews } = useAdmin();
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const columns: Column<Review>[] = [
    { key: "listing", label: "Listing", render: (r) => <span className="font-medium">{r.listing}</span> },
    { key: "author", label: "By / Owner" },
    { key: "target", label: "About" },
    { key: "rating", label: "Stars" },
    { key: "city", label: "Location" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <ResourcePage
      title="Reviews & Ratings"
      summary="Buyer and seller reviews on live listings. Flag or hide reviews that break posting rules."
      kpis={[
        { label: "Reviews", value: reviews.length, tone: "brand" },
        { label: "Average", value: avg, tone: "green" },
        { label: "Flagged", value: reviews.filter((r) => r.status === "flagged").length, tone: "amber" },
        { label: "Hidden", value: reviews.filter((r) => r.status === "hidden").length, tone: "red" },
        { label: "Five star", value: reviews.filter((r) => r.rating === 5).length, tone: "green" },
      ]}
      rows={reviews}
      columns={columns}
      tabs={["All", "Active", "Flagged", "Hidden"]}
      storeKey="reviews"
      statusActions={["active", "flagged", "hidden"]}
      detail={(r) => (
        <>
          <Kv label="Author" value={r.author} />
          <Kv label="Target" value={r.target} />
          <Kv label="Rating" value={`${r.rating} / 5`} />
          <Kv label="City" value={r.city} />
          <p className="rounded-xl bg-elevated p-3 text-sm leading-relaxed text-ink">{r.text}</p>
        </>
      )}
    />
  );
}
