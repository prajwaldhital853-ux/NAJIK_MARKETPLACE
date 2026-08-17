"use client";

import { useState } from "react";
import { CATEGORY_SHARE, GROWTH, PLATFORM_KPIS, REVENUE_BARS } from "@/lib/demo-data";
import { compact, npr } from "@/lib/format";
import { CategoryDonut, LineGrowth, RevenueBars } from "@/components/admin/charts";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { KpiCard } from "@/components/admin/ui";
import { useAdmin } from "@/lib/store";

export default function AnalyticsPage() {
  const { users, orders, payments, properties } = useAdmin();
  const [city, setCity] = useState("All Nepal");
  const cities = ["All Nepal", "Kathmandu", "Lalitpur", "Pokhara", "Lahan", "Biratnagar"];

  return (
    <div>
      <PageHeader
        title="Analytics"
        summary="Marketplace pulse for the last 30 days: user growth, NPR GMV, category mix, and the demo working set (20 users, 16 properties, 15 bookings). Switch city to snapshot regional ops — Valley vs East corridor. Charts use the same series as the main dashboard so exec and ops stay aligned."
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
          { label: "Platform users", value: compact(PLATFORM_KPIS.totalUsers), delta: "+12.5%", tone: "brand" },
          { label: "GMV", value: npr(PLATFORM_KPIS.revenue), delta: "+16.4%", tone: "green" },
          { label: "Listings", value: compact(PLATFORM_KPIS.listings), delta: "+8.1%", tone: "brand" },
          { label: "Providers", value: compact(PLATFORM_KPIS.providers), delta: "+9.4%", tone: "green" },
          { label: "Focus city", value: city, tone: "amber" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-glow rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">User growth</h2>
          <p className="mb-2 text-[11px] text-muted">Monthly new users · Jan–Jun</p>
          <LineGrowth data={GROWTH.Users} />
        </section>
        <section className="card-glow rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">Daily GMV</h2>
          <p className="mb-2 text-[11px] text-muted">NPR · last 30 days</p>
          <RevenueBars data={REVENUE_BARS} />
        </section>
        <section className="card-glow rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Listing mix</h2>
          <CategoryDonut data={CATEGORY_SHARE} />
        </section>
        <section className="card-glow grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-2">
          <KpiCard label="Demo users (session)" value={users.length} />
          <KpiCard label="Demo properties" value={properties.length} />
          <KpiCard label="Demo bookings" value={orders.length} />
          <KpiCard
            label="Completed GMV (demo)"
            value={npr(payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0))}
          />
          <div className="sm:col-span-2 rounded-xl bg-elevated p-3 text-sm text-muted">
            {city === "All Nepal"
              ? "National view. East corridor (Lahan, Siraha, Dharan, Biratnagar) is 22% of new listings this month."
              : `${city} snapshot: listings and bookings in the demo set that mention this city are highlighted in User and Property tables via search.`}
          </div>
        </section>
      </div>
    </div>
  );
}
