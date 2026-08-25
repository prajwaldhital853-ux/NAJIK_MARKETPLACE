"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { NAV } from "@/lib/nav";
import { filterNavForStaff } from "@/lib/rbac";
import { useSession } from "@/lib/session";
import { useAdmin } from "@/lib/store";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const { staff } = useSession();
  const { users, properties, jobs, gadgets } = useAdmin();
  const navItems = useMemo(() => filterNavForStaff(NAV, staff), [staff]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pages = navItems.flatMap((n) => [
      { href: n.href, label: n.label, kind: "Page" },
      ...(n.children || []).map((c) => ({ href: c.href, label: c.label, kind: "Page" })),
    ]);
    const people = users.map((u) => ({ href: `/admin/users?q=${encodeURIComponent(u.name)}`, label: u.name, kind: "User" }));
    const props = properties.map((p) => ({
      href: `/admin/properties?q=${encodeURIComponent(p.title)}`,
      label: p.title,
      kind: "Property",
    }));
    const jobRows = jobs.map((j) => ({ href: `/admin/jobs?q=${encodeURIComponent(j.title)}`, label: j.title, kind: "Job" }));
    const gear = gadgets.map((g) => ({
      href: `/admin/electronics?q=${encodeURIComponent(g.title)}`,
      label: g.title,
      kind: "Electronics",
    }));
    const all = [...pages, ...people, ...props, ...jobRows, ...gear];
    if (!needle) return all.slice(0, 12);
    return all.filter((r) => r.label.toLowerCase().includes(needle)).slice(0, 16);
  }, [q, users, properties, jobs, gadgets, navItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a page, user, or listing…"
            className="w-full bg-transparent py-3.5 text-sm text-ink outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.map((r) => (
            <li key={`${r.kind}-${r.href}-${r.label}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-elevated"
                onClick={() => {
                  router.push(r.href);
                  onClose();
                  setQ("");
                }}
              >
                <span className="text-sm text-ink">{r.label}</span>
                <span className="text-[11px] text-muted">{r.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
