"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Filter,
  Briefcase,
  Home,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import { REVENUE_BARS, type Activity } from "@/lib/demo-data";
import { compact, npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import { CategoryDonut, LineGrowth, RevenueBars } from "@/components/admin/charts";
import { LiveSellerQueue } from "@/components/admin/live-seller-queue";
import { Avatar, KpiCard, MiniStat, StatusBadge } from "@/components/admin/ui";
import { DataTable, TypeChip, type Column } from "@/components/admin/table";
import { staffListingDetailHref } from "@/lib/staff-listing-nav";

const RANGES = [
  "Jul 17, 2026 – Aug 17, 2026",
  "Last 7 days",
  "Last 30 days",
  "This quarter",
  "Year to date",
];

const TABLE_TABS = ["All", "Users", "Properties", "Jobs", "Electronics", "Reports", "Services"];

export default function DashboardPage() {
  const router = useRouter();
  const { staff } = useSession();
  const { kpis: k, growth, categories, activity, liveListings } = useAdmin();
  const [range, setRange] = useState(RANGES[0]);
  const chartKeys = Object.keys(growth) as (keyof typeof growth)[];
  const [chartTab, setChartTab] = useState<(keyof typeof growth)>("Users");
  const [tableTab, setTableTab] = useState("All");

  const rows = useMemo(() => {
    if (tableTab === "All") return activity;
    const map: Record<string, string> = {
      Users: "New User",
      Properties: "New Property",
      Jobs: "New Job",
      Electronics: "Electronics",
      Reports: "Report",
      Services: "Service",
    };
    const type = map[tableTab];
    return activity.filter(
      (a) =>
        a.type === type ||
        (tableTab === "Users" && (a.type === "New User" || a.type === "KYC")) ||
        (tableTab === "Properties" && (a.type === "New Property" || a.type === "Edit request")),
    );
  }, [tableTab, activity]);

  const columns: Column<Activity>[] = [
    {
      key: "type",
      label: "Type",
      render: (r) => <TypeChip label={r.type} color={r.typeColor} />,
    },
    {
      key: "title",
      label: "Title / Name",
      render: (r) => (
        <span className="flex items-center gap-2">
          <Avatar name={r.title} id={r.id} size={28} />
          <span className="font-medium">{r.title}</span>
        </span>
      ),
    },
    { key: "by", label: "By / Owner" },
    { key: "category", label: "Category" },
    { key: "location", label: "Location" },
    { key: "time", label: "Time" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted">Dashboard / Welcome back, {staff?.name.split(" ")[0]}</p>
          <h1 className="mt-0.5 text-[18px] font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-[12px] text-muted">
            Users, listings, KYC, payouts and reports for the selected window.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1.5 rounded border border-line bg-card px-2 py-1.5 text-[12px] text-ink">
            <CalendarDays size={13} className="text-muted" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-transparent text-[12px] outline-none"
            >
              {RANGES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button type="button" className="flex items-center gap-1.5 rounded border border-line bg-card px-2 py-1.5 text-[12px] text-ink">
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Users" value={compact(k.totalUsers)} tone="brand" icon={<Users size={13} />} />
        <KpiCard label="Active Users" value={compact(k.activeUsers)} tone="green" icon={<Users size={13} />} />
        <KpiCard label="Verified Users" value={compact(k.verifiedUsers)} tone="green" icon={<Users size={13} />} />
        <KpiCard label="Blocked Users" value={compact(k.blockedUsers)} tone="red" icon={<Users size={13} />} />
        <KpiCard label="Pending Users" value={compact(k.pendingUsers)} tone="amber" icon={<Users size={13} />} />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <MiniStat label="Active Property Users" value={compact(k.propertyUsers)} color="#1b7d2c" icon={<Home size={13} />} />
        <MiniStat label="Active Job Users" value={compact(k.jobUsers)} color="#3d6b5a" icon={<Briefcase size={13} />} />
        <MiniStat label="Active Service Users" value={compact(k.serviceUsers)} color="#5a6b52" icon={<Wrench size={13} />} />
        <MiniStat label="Service Providers" value={compact(k.providers)} color="#167a38" icon={<Users size={13} />} />
        <MiniStat label="Electronic Users" value={compact(k.electronicUsers)} color="#6b7054" icon={<Smartphone size={13} />} />
        <MiniStat label="Used Item Users" value={compact(k.usedItemUsers)} color="#4a6356" icon={<ShoppingBag size={13} />} />
        <MiniStat label="Shop Users" value={compact(k.shopUsers)} color="#7a5c3a" icon={<Store size={13} />} />
      </div>

      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
        <span>Properties: <b className="text-ink">{compact(k.properties)}</b></span>
        <span>Listings: <b className="text-ink">{compact(k.listings)}</b></span>
        <span>Jobs: <b className="text-ink">{compact(k.jobs)}</b></span>
        <span>Vehicles: <b className="text-ink">{compact(k.vehicles)}</b></span>
        <span>Providers: <b className="text-ink">{compact(k.providers)}</b></span>
        <span>Used items: <b className="text-ink">{compact(k.usedItems)}</b></span>
        <span>Shops: <b className="text-ink">{compact(k.shops)}</b></span>
        <span>Electronics: <b className="text-ink">{compact(k.electronics)}</b></span>
      </p>

      <LiveSellerQueue />

      <div className="mt-3 grid min-w-0 gap-2 xl:grid-cols-12">
        <section className="min-w-0 rounded border border-line bg-card p-3 xl:col-span-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Platform Overview</h2>
              <p className="text-[10px] text-muted">New records · {range}</p>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {chartKeys.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChartTab(t)}
                  className={`rounded px-1.5 py-0.5 text-[10px] ${chartTab === t ? "bg-brand text-white" : "text-muted hover:bg-elevated"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <LineGrowth data={growth[chartTab]} />
        </section>

        <section className="min-w-0 rounded border border-line bg-card p-3 xl:col-span-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Revenue Overview</h2>
              <p className="text-[10px] text-muted">Daily GMV in NPR</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-ink">{npr(k.revenue)}</p>
              {k.revenueDelta ? <p className="text-[10px] text-green">+{k.revenueDelta}%</p> : null}
            </div>
          </div>
          <RevenueBars data={REVENUE_BARS} />
        </section>

        <section className="min-w-0 rounded border border-line bg-card p-3 xl:col-span-3">
          <h2 className="mb-1 text-[13px] font-semibold text-ink">Top Categories</h2>
          <CategoryDonut data={categories} />
        </section>
      </div>

      <div className="mt-3 min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-ink">Recent Items</h2>
          <Link href="/admin/properties" className="text-[11px] font-medium text-brand">
            View All
          </Link>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          tabs={TABLE_TABS}
          tab={tableTab}
          onTab={setTableTab}
          onRow={(row) => {
            if (row.id.startsWith("live-")) {
              router.push(`/admin/users?id=${row.id.replace("live-", "")}`);
              return;
            }
            if (row.id.startsWith("listing-")) {
              const listingId = row.id.replace(/^listing-/, "").replace(/-edit$/, "");
              const listing = liveListings.find((item) => item.id === listingId);
              if (listing) router.push(staffListingDetailHref(listing));
            }
          }}
        />
      </div>
    </div>
  );
}
