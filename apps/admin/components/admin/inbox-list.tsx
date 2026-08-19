"use client";

import Link from "next/link";
import type { InboxItem } from "@/lib/live-inbox";
import { useAdmin } from "@/lib/store";

export function InboxList({
  items,
  onOpen,
}: {
  items: InboxItem[];
  onOpen?: () => void;
}) {
  const { markInboxSeen } = useAdmin();
  if (!items.length) {
    return <p className="px-4 py-6 text-sm text-muted">No new listings, user requests, or complaints.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="border-b border-line last:border-b-0">
          <Link
            href={item.href}
            onClick={() => {
              markInboxSeen(item.id);
              onOpen?.();
            }}
            className="block px-4 py-3 hover:bg-elevated"
          >
            <p className="text-[12px] font-medium text-ink">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-muted">{item.detail}</p>
            <p className="mt-1 text-[10px] text-faint">{item.time}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
