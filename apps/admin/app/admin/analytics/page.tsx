"use client";

import { useState } from "react";
import { compact, npr } from "@/lib/format";
import { REVENUE_BARS } from "@/lib/demo-data";
import { CategoryDonut, LineGrowth, RevenueBars } from "@/components/admin/charts";
import { PageHeader, SummaryStrip, AdminLoadingState } from "@/components/admin/page-frame";
import { KpiCard } from "@/components/admin/ui";
import { useAdmin } from "@/lib/store";

export default function AnalyticsPage() {
  const { users, orders, payments, properties, kpis, growth, categories, inboxReady } = useAdmin();
  const [city, setCity] = useState("All Nepal");
  const cities = ["All Nepal", "Kathmandu", "Lalitpur", "Pokhara", "Lahan", "Biratnagar"];
  const gmv = payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  if (!inboxReady) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          summary="Live marketplace counts from app signups and submitted listings. Charts follow the same series as the dashboard."
        />
        <AdminLoadingState label="Loading analytics…" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        summary="Live marketplace counts from app signups and submitted listings. Charts follow the same series as the dashboard."
        extra={
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        }
      />
      <SummaryStrip
        items={[
          { label: "Platform users", value: compact(kpis.totalUsers), tone: "brand" },
          { label: "GMV", value: npr(kpis.revenue || gmv), tone: "green" },
          { label: "Listings", value: compact(kpis.listings), tone: "brand" },
          { label: "Providers", value: compact(kpis.providers), tone: "green" },
          { label: "Focus city", value: city, tone: "amber" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-glow rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">User growth</h2>
          <p className="mb-2 text-[11px] text-muted">Monthly new users · Jan–Jun</p>
          <LineGrowth data={growth.Users} />
        </section>
        <section className="card-glow rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">Daily GMV</h2>
          <p className="mb-2 text-[11px] text-muted">NPR · last 30 days</p>
          <RevenueBars data={REVENUE_BARS} />
        </section>
        <section className="card-glow rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Listing mix</h2>
          <CategoryDonut data={categories} />
        </section>
        <section className="card-glow grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-2">
          <KpiCard label="Users" value={users.length} />
          <KpiCard label="Properties" value={properties.length} />
          <KpiCard label="Bookings" value={orders.length} />
          <KpiCard label="Completed GMV" value={npr(gmv)} />
          <div className="sm:col-span-2 rounded-xl bg-elevated p-3 text-sm text-muted">
            {city === "All Nepal"
              ? "National view of live users and listings."
              : `${city} can be used as a search filter on User and Property tables.`}
          </div>
        </section>
      </div>
    </div>
  );
}
