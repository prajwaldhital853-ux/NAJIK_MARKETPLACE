"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";
import type { InboxItem } from "@/lib/live-inbox";
import { useAdmin } from "@/lib/store";

export function InboxList({
  items,
  onOpen,
  showMarkActions,
  onMarked,
}: {
  items: InboxItem[];
  onOpen?: () => void;
  /** Show a per-row “Mark as read” control (notifications page + bell panel). */
  showMarkActions?: boolean;
  onMarked?: (count: number) => void;
}) {
  const { markInboxSeen } = useAdmin();

  if (!items.length) {
    return <p className="px-4 py-6 text-sm text-muted">No unread notifications.</p>;
  }

  function markOne(id: string) {
    markInboxSeen(id);
    onMarked?.(1);
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="flex items-stretch border-b border-line last:border-b-0">
          <Link
            href={item.href}
            onClick={() => {
              markInboxSeen(item.id);
              onOpen?.();
            }}
            className="min-w-0 flex-1 px-4 py-3 hover:bg-elevated"
          >
            <p className="text-[12px] font-medium text-ink">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-muted">{item.detail}</p>
            <p className="mt-1 text-[10px] text-faint">{item.time}</p>
          </Link>
          {showMarkActions ? (
            <button
              type="button"
              title="Mark as read"
              aria-label={`Mark as read: ${item.title}`}
              onClick={() => markOne(item.id)}
              className="flex shrink-0 items-center gap-1 border-l border-line px-3 text-[11px] font-semibold text-brand hover:bg-brand-soft"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Read</span>
            </button>
          ) : null}
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

export function InboxMarkAllButton({
  count,
  onMarkAll,
  compact,
}: {
  count: number;
  onMarkAll: () => void;
  compact?: boolean;
}) {
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={onMarkAll}
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold text-brand hover:bg-brand-soft ${
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <CheckCheck size={compact ? 13 : 14} />
      Mark all as read
    </button>
  );
}
