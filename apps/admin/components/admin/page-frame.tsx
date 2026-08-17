"use client";

import { compact } from "@/lib/format";
import { KpiCard } from "./ui";

export function PageHeader({
  title,
  crumb,
  summary,
  extra,
}: {
  title: string;
  crumb?: string;
  summary: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-3xl">
        <p className="text-[11px] text-muted">{crumb || `Dashboard / ${title}`}</p>
        <h1 className="mt-0.5 text-[18px] font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[12px] leading-snug text-muted">{summary}</p>
      </div>
      {extra}
    </div>
  );
}

export function SummaryStrip({
  items,
}: {
  items: { label: string; value: number | string; delta?: string; tone?: "brand" | "green" | "amber" | "red" }[];
}) {
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <KpiCard
          key={item.label}
          label={item.label}
          value={typeof item.value === "number" ? compact(item.value) : item.value}
          delta={item.delta}
          tone={item.tone}
        />
      ))}
    </div>
  );
}
