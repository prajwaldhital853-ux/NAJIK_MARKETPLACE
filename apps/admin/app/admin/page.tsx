"use client";

import { useEffect, useMemo, useState } from "react";
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
  X,
} from "lucide-react";
import { type Activity, type User } from "@/lib/demo-data";
import { compact, npr } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import { getStaffPaymentsSummary } from "@/lib/staff-api";
import { CategoryDonut, LineGrowth, RevenueOverview } from "@/components/admin/charts";
import { LiveSellerQueue } from "@/components/admin/live-seller-queue";
import { Avatar, KpiCard, MiniStat, StatusBadge } from "@/components/admin/ui";
import { DataTable, TypeChip, type Column, type RowMenuAction } from "@/components/admin/table";
import { UserDetailDrawer } from "@/components/admin/user-detail-drawer";
import { staffListingDetailHref } from "@/lib/staff-listing-nav";

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This quarter", days: 90 },
  { label: "Year to date", days: -1 },
] as const;

const TABLE_TABS = ["All", "Users", "Properties", "Jobs", "Electronics", "Reports", "Services"];
const STATUS_FILTERS = ["All statuses", "Pending", "Active", "Approved", "Blocked", "Verified"];

function activityInRange(row: Activity, rangeDays: number): boolean {
  const at = row.at || 0;
  if (!at) return true;
  if (rangeDays === -1) {
    const start = new Date(new Date().getFullYear(), 0, 1).getTime();
    return at >= start;
  }
  const since = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  return at >= since;
}

export default function DashboardPage() {
  const router = useRouter();
  const { staff } = useSession();
  const { kpis: k, growth, categories, activity, liveListings, users, paymentsSummary } = useAdmin();
  const [rangeDays, setRangeDays] = useState(30);
  const [rangeLabel, setRangeLabel] = useState("Last 30 days");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [openUser, setOpenUser] = useState<User | null>(null);
  const chartKeys = Object.keys(growth) as (keyof typeof growth)[];
  const [chartTab, setChartTab] = useState<(keyof typeof growth)>("Users");
  const [tableTab, setTableTab] = useState("All");
  const [revenuePeriod, setRevenuePeriod] = useState("month");
  const [revenueSeries, setRevenueSeries] = useState<{ label: string; admin_v: number; load_v: number; v: number }[]>([]);
  const [revenueTotals, setRevenueTotals] = useState({ admin: "", load: "", total: "" });
  const [revenueLoading, setRevenueLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setRevenueLoading(true);
    void getStaffPaymentsSummary(revenuePeriod)
      .then((data) => {
        if (!alive) return;
        setRevenueSeries(
          (data.wallet_revenue_series || []).map((row) => ({
            label: row.label,
            admin_v: row.admin_v,
            load_v: row.load_v,
            v: row.v,
          })),
        );
        setRevenueTotals({
          admin: data.admin_credit_total_label,
          load: data.approved_load_total_label,
          total: data.total_revenue_label,
        });
      })
      .catch(() => {
        if (!alive) return;
        setRevenueSeries([]);
      })
      .finally(() => {
        if (alive) setRevenueLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revenuePeriod]);

  const filteredActivity = useMemo(() => {
    return activity.filter((row) => activityInRange(row, rangeDays));
  }, [activity, rangeDays]);

  const rows = useMemo(() => {
    let list = filteredActivity;
    if (tableTab !== "All") {
      const map: Record<string, string> = {
        Users: "New User",
        Properties: "New Property",
        Jobs: "New Job",
        Electronics: "Electronics",
        Reports: "Report",
        Services: "Service",
      };
      const type = map[tableTab];
      list = list.filter(
        (a) =>
          a.type === type ||
          (tableTab === "Users" && (a.type === "New User" || a.type === "KYC")) ||
          (tableTab === "Properties" && (a.type === "New Property" || a.type === "Edit request")),
      );
    }
    if (statusFilter !== "All statuses") {
      const needle = statusFilter.toLowerCase();
      list = list.filter((a) => a.status.toLowerCase().includes(needle));
    }
    return list;
  }, [tableTab, filteredActivity, statusFilter]);

  function openActivityRow(row: Activity) {
    if (row.id.startsWith("live-")) {
      const userId = row.id.replace("live-", "");
      const user = users.find((u) => u.id === userId);
      if (user) setOpenUser(user);
      return;
    }
    if (row.id.startsWith("listing-")) {
      const listingId = row.id.replace(/^listing-/, "").replace(/-edit$/, "");
      const listing = liveListings.find((item) => item.id === listingId);
      if (listing) router.push(staffListingDetailHref(listing));
    }
  }

  const rowActions: RowMenuAction<Activity>[] = [
    { label: "View details", onClick: (row) => openActivityRow(row) },
    {
      label: "Open user profile",
      onClick: (row) => {
        if (!row.id.startsWith("live-")) {
          const listingId = row.id.replace(/^listing-/, "").replace(/-edit$/, "");
          const listing = liveListings.find((item) => item.id === listingId);
          if (listing?.owner_id) router.push(`/admin/users?id=${listing.owner_id}`);
          return;
        }
        const userId = row.id.replace("live-", "");
        router.push(`/admin/users?id=${userId}`);
      },
    },
    {
      label: "Open listing",
      onClick: (row) => {
        if (!row.id.startsWith("listing-")) return;
        const listingId = row.id.replace(/^listing-/, "").replace(/-edit$/, "");
        const listing = liveListings.find((item) => item.id === listingId);
        if (listing) router.push(staffListingDetailHref(listing));
      },
    },
  ];

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
    {
      key: "time",
      label: "Time",
      sortValue: (r) => r.at || 0,
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const revenueTotalLabel = revenueTotals.total || paymentsSummary?.total_revenue_label || npr(k.revenue);
  const revenueAdminLabel = revenueTotals.admin || paymentsSummary?.admin_credit_total_label || "—";
  const revenueLoadLabel = revenueTotals.load || paymentsSummary?.approved_load_total_label || "—";

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
            <CalendarDays size={13} className="shrink-0 text-muted" />
            <select
              value={rangeLabel}
              onChange={(e) => {
                const match = RANGES.find((r) => r.label === e.target.value);
                if (match) {
                  setRangeLabel(match.label);
                  setRangeDays(match.days);
                }
              }}
              className="min-w-0 cursor-pointer bg-card text-[12px] text-ink outline-none [&>option]:bg-card [&>option]:text-ink"
            >
              {RANGES.map((r) => (
                <option key={r.label} value={r.label}>{r.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-[12px] ${
              filtersOpen || statusFilter !== "All statuses"
                ? "border-brand bg-brand/10 text-brand"
                : "border-line bg-card text-ink"
            }`}
          >
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded border border-line bg-card p-3">
          <label className="block text-[11px] text-muted">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full min-w-[160px] rounded border border-line bg-elevated px-2 py-1.5 text-[12px] text-ink outline-none [&>option]:bg-card [&>option]:text-ink"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("All statuses");
              setFiltersOpen(false);
            }}
            className="flex items-center gap-1 rounded border border-line px-2 py-1.5 text-[12px] text-muted hover:bg-elevated"
          >
            <X size={13} />
            Clear
          </button>
        </div>
      ) : null}

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
              <p className="text-[10px] text-muted">New records · {rangeLabel}</p>
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
          <h2 className="mb-1 text-[13px] font-semibold text-ink">Revenue Overview</h2>
          <RevenueOverview
            adminTotalLabel={revenueAdminLabel}
            loadTotalLabel={revenueLoadLabel}
            totalLabel={revenueTotalLabel}
            series={revenueSeries}
            period={revenuePeriod}
            onPeriod={setRevenuePeriod}
            loading={revenueLoading}
          />
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
          onRow={openActivityRow}
          rowActions={rowActions}
        />
      </div>
      <UserDetailDrawer user={openUser} onClose={() => setOpenUser(null)} />
    </div>
  );
}
