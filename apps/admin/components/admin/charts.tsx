

"use client";

import { useTheme } from "@/lib/theme";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    grid: dark ? "#2c302e" : "#e4e7e4",
    tick: dark ? "#9aa09c" : "#5f6368",
    tooltipBg: dark ? "#1c1e1d" : "#ffffff",
    tooltipBorder: dark ? "#2c302e" : "#e4e7e4",
    line: "#1b7d2c",
  };
}

export function LineGrowth({ data }: { data: { m: string; v: number }[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={168}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="m" stroke={c.tick} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke={c.tick} fontSize={10} width={36} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 4, fontSize: 12 }}
          formatter={(v) => [Number(v).toLocaleString(), "Value"]}
        />
        <Area type="monotone" dataKey="v" stroke="#1b7d2c" strokeWidth={1.75} fill="#1b7d2c22" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueBars({ data }: { data: { d: string; v: number }[] }) {
  const c = useChartColors();
  const chartData = data.map((row) => ({ label: row.d, v: row.v }));
  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart data={chartData} margin={{ top: 8, right: 2, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" stroke={c.tick} fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 4, fontSize: 12 }}
          formatter={(v) => [`NPR ${Number(v).toLocaleString()}`, "Credits"]}
        />
        <Bar dataKey="v" fill="#1b7d2c" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const REVENUE_PERIODS = [
  { id: "day", label: "Daily" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
  { id: "all", label: "All time" },
] as const;

export function RevenueOverview({
  totalLabel,
  series,
  period,
  onPeriod,
  loading,
}: {
  totalLabel: string;
  series: { label: string; v: number }[];
  period: string;
  onPeriod: (id: string) => void;
  loading?: boolean;
}) {
  const c = useChartColors();
  const chartData = series.length ? series : [{ label: "—", v: 0 }];
  const periodTotal = series.reduce((sum, row) => sum + row.v, 0);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">Admin credits to seller wallets</p>
          <p className="text-[12px] font-semibold text-ink">{totalLabel}</p>
          <p className="text-[10px] text-muted">
            {loading ? "Loading…" : `NPR ${periodTotal.toLocaleString()} in this view`}
          </p>
        </div>
        <div className="flex flex-wrap gap-0.5">
          {REVENUE_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriod(p.id)}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                period === p.id ? "bg-brand text-white" : "text-muted hover:bg-elevated"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={168}>
        <BarChart data={chartData} margin={{ top: 8, right: 2, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" stroke={c.tick} fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke={c.tick} fontSize={9} width={40} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 4, fontSize: 12 }}
            formatter={(v) => [`NPR ${Number(v).toLocaleString()}`, "Admin credit"]}
          />
          <Bar dataKey="v" fill="#1b7d2c" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({
  data,
}: {
  data: { name: string; value: number; count: number; color: string }[];
}) {
  const c = useChartColors();
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="min-w-0">
      <div className="relative mx-auto h-[132px] w-[132px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={38} outerRadius={56} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 4, fontSize: 12 }}
              formatter={(v, _n, item) => [`${v}%`, item.payload.name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[9px] text-muted">Listings</p>
          <p className="text-[13px] font-semibold text-ink">{total.toLocaleString()}</p>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        {data.map((d) => (
          <li key={d.name} className="flex min-w-0 items-center justify-between gap-1">
            <span className="flex min-w-0 items-center gap-1 text-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {d.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
