"use client";

import { colorFor, initials } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { X } from "lucide-react";

export function Avatar({ name, id, size = 36 }: { name: string; id?: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size < 32 ? 10 : 12,
        background: colorFor(id || name),
      }}
    >
      {initials(name)}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    active: "bg-green-soft text-green",
    verified: "bg-green-soft text-green",
    approved: "bg-green-soft text-green",
    completed: "bg-green-soft text-green",
    live: "bg-green-soft text-green",
    sent: "bg-green-soft text-green",
    ok: "bg-green-soft text-green",
    edit_pending: "bg-amber-soft text-amber",
    pending: "bg-amber-soft text-amber",
    invited: "bg-amber-soft text-amber",
    scheduled: "bg-amber-soft text-amber",
    paused: "bg-amber-soft text-amber",
    draft: "bg-amber-soft text-amber",
    deactivated: "bg-red-soft text-red",
    rejected: "bg-red-soft text-red",
    failed: "bg-red-soft text-red",
    cancelled: "bg-red-soft text-red",
    hidden: "bg-red-soft text-red",
    disabled: "bg-red-soft text-red",
    danger: "bg-red-soft text-red",
    under_review: "bg-brand-soft text-brand",
    open: "bg-brand-soft text-brand",
    flagged: "bg-brand-soft text-brand",
    urgent: "bg-amber-soft text-amber",
    ended: "text-muted bg-elevated",
    none: "text-muted bg-elevated",
    resolved: "bg-green-soft text-green",
    info: "bg-brand-soft text-brand",
    warn: "bg-amber-soft text-amber",
  };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[key] || "bg-elevated text-muted"}`}>
      {label}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: React.ReactNode;
  tone?: "brand" | "green" | "amber" | "red" | "purple" | "cyan";
}) {
  const tones: Record<string, string> = {
    brand: "text-brand bg-brand-soft",
    green: "text-green bg-green-soft",
    amber: "text-amber bg-amber-soft",
    red: "text-red bg-red-soft",
    purple: "text-purple bg-brand-soft",
    cyan: "text-cyan bg-brand-soft",
  };
  const up = delta?.startsWith("+");
  return (
    <div className="rounded border border-line bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted">{label}</p>
        {icon ? <span className={`rounded p-1 ${tones[tone]}`}>{icon}</span> : null}
      </div>
      <p className="mt-1.5 text-[18px] font-semibold tracking-tight text-ink">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {delta ? (
        <p className={`mt-0.5 text-[11px] ${up ? "text-green" : "text-red"}`}>
          {delta} <span className="text-muted">30d</span>
        </p>
      ) : null}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  delta,
  icon,
  color,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded border border-line bg-card px-2 py-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white" style={{ background: color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-muted">{label}</p>
        <p className="text-[12px] font-semibold text-ink">{value}</p>
      </div>
      {delta ? <span className="ml-auto shrink-0 text-[10px] font-medium text-green">{delta}</span> : null}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
className={`rounded border border-line bg-card p-4 ${wide ? "w-full max-w-3xl" : "w-full max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-elevated">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="admin-scroll h-full w-full max-w-md overflow-y-auto border-l border-line bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-elevated">
            <X size={18} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function ToastHost() {
  const { toasts } = useAdmin();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded border border-line bg-elevated px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand";

export function Btn({
  children,
  onClick,
  kind = "primary",
  type = "button",
  disabled,
  loading,
  loadingLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  kind?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const cls =
    kind === "primary"
      ? "bg-brand text-white hover:bg-brand/90"
      : kind === "danger"
        ? "border border-red/30 bg-red-soft text-red hover:bg-red/10"
        : "border border-line bg-card text-ink hover:bg-elevated";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition disabled:opacity-50 ${cls}`}
    >
      {loading ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{loadingLabel || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
