"use client";

import Link from "next/link";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { StatusBadge } from "./ui";

export function LiveSellerQueue() {
  const { applications } = useAdmin();
  const pending = applications.filter((i) => i.status === "pending");
  const latest = [...applications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <section className="mt-3 rounded border border-line bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Live seller applications</h2>
          <p className="text-[10px] text-muted">
            {pending.length} pending · new KYC from the app appears here with documents and timestamp
          </p>
        </div>
        <Link href="/admin/providers" className="rounded border border-line px-2 py-1 text-[12px] font-semibold text-ink">
          Open queue
        </Link>
      </div>
      {latest.length === 0 ? (
        <p className="text-[12px] text-muted">No seller applications yet.</p>
      ) : (
        <ul className="max-h-56 divide-y divide-line overflow-y-auto pr-1">
          {latest.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="text-[12px] font-medium text-ink">{item.full_name}</p>
                <p className="text-[11px] text-muted">
                  {item.service_type} · {formatNptDateTime(item.created_at)}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
