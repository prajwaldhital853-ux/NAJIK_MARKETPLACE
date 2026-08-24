"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, MoreHorizontal, Search } from "lucide-react";
import { StatusBadge } from "./ui";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export type RowMenuAction<T> = {
  label: string;
  onClick: (row: T) => void;
  danger?: boolean;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  tabs,
  tab,
  onTab,
  onRow,
  onAction,
  rowActions,
  searchPlaceholder = "Filter rows…",
  hideSearch = false,
}: {
  rows: T[];
  columns: Column<T>[];
  tabs?: string[];
  tab?: string;
  onTab?: (t: string) => void;
  onRow?: (row: T) => void;
  /** @deprecated Prefer rowActions for kebab menu */
  onAction?: (row: T) => void;
  rowActions?: RowMenuAction<T>[];
  searchPlaceholder?: string;
  hideSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const per = 8;

  useEffect(() => {
    if (!menuId) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (needle) {
      list = list.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      list = [...list].sort((a, b) => {
        const av = col?.sortValue ? col.sortValue(a) : String((a as Record<string, unknown>)[sortKey] ?? "");
        const bv = col?.sortValue ? col.sortValue(b) : String((b as Record<string, unknown>)[sortKey] ?? "");
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, q, sortKey, asc, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice(page * per, page * per + per);

  function toggleSort(key: string) {
    if (sortKey === key) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  return (
    <div className="overflow-hidden rounded border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        {tabs?.length ? (
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onTab?.(t);
                  setPage(0);
                }}
                className={`rounded px-2 py-1 text-[11px] ${
                  (tab || tabs[0]) === t ? "bg-brand text-white" : "text-muted hover:bg-elevated"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-ink">Records</p>
        )}
        {!hideSearch ? (
          <div className="relative">
            <Search size={14} className="absolute top-2.5 left-2.5 text-faint" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="w-52 rounded-lg border border-line bg-elevated py-1.5 pr-3 pl-8 text-xs text-ink outline-none"
            />
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="text-[11px] tracking-wide text-muted uppercase">
            <tr className="border-b border-line">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={slice.length > 0 && slice.every((r) => selected.includes(r.id))}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(Array.from(new Set([...selected, ...slice.map((r) => r.id)])));
                    else setSelected(selected.filter((id) => !slice.some((r) => r.id === id)));
                  }}
                />
              </th>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key ? asc ? <ChevronUp size={12} /> : <ChevronDown size={12} /> : null}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-line/80 hover:bg-elevated/70"
                onClick={() => onRow?.(row)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={(e) =>
                      setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))
                    }
                  />
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3 text-ink">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                <td className="relative px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-muted hover:bg-card hover:text-brand"
                      onClick={() => onRow?.(row)}
                      aria-label="View details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-muted hover:bg-card"
                      onClick={() => {
                        if (rowActions?.length) {
                          setMenuId((cur) => (cur === row.id ? null : row.id));
                          return;
                        }
                        onAction?.(row);
                      }}
                      aria-label="More actions"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                  {menuId === row.id && rowActions?.length ? (
                    <div
                      ref={menuRef}
                      className="absolute right-3 z-20 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg"
                    >
                      {rowActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-xs font-medium hover:bg-elevated ${
                            action.danger ? "text-red" : "text-ink"
                          }`}
                          onClick={() => {
                            setMenuId(null);
                            action.onClick(row);
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted">
        <p>
          {selected.length ? `${selected.length} selected · ` : null}
          {filtered.length} rows
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-line px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-line px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export function TypeChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color, background: `${color}22` }}>
      {label}
    </span>
  );
}

export { StatusBadge };
