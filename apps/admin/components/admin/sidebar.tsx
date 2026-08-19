"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Flag,
  Home,
  Layers,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  Wallet,
  Wrench,
  BadgeCheck,
  BarChart3,
  LifeBuoy,
} from "lucide-react";
import { NAV } from "@/lib/nav";
import { useAdmin } from "@/lib/store";
import { CountBadge } from "./inbox-list";

const ICONS: Record<string, React.ReactNode> = {
  layout: <LayoutDashboard size={14} />,
  users: <Users size={14} />,
  home: <Home size={14} />,
  briefcase: <Briefcase size={14} />,
  wrench: <Wrench size={14} />,
  smartphone: <Smartphone size={14} />,
  layers: <Layers size={14} />,
  calendar: <CalendarDays size={14} />,
  wallet: <Wallet size={14} />,
  shield: <ShieldCheck size={14} />,
  flag: <Flag size={14} />,
  star: <Star size={14} />,
  bell: <Bell size={14} />,
  megaphone: <Megaphone size={14} />,
  chart: <BarChart3 size={14} />,
  badge: <BadgeCheck size={14} />,
  settings: <Settings size={14} />,
};

function pathMatches(href: string, pathname: string, search: string) {
  if (href === "/admin") return pathname === "/admin";
  const [base, query] = href.split("?");
  if (!pathname.startsWith(base)) return false;
  if (!query) {
    if (pathname !== base && pathname !== `${base}/`) return pathname.startsWith(`${base}/`);
    return !search || search === "";
  }
  return search.includes(query);
}

export function Sidebar({
  className = "hidden lg:flex",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { badges } = useAdmin();
  const [open, setOpen] = useState<string>(() => {
    const match = NAV.find((n) => n.href !== "/admin" && pathname.startsWith(n.href));
    return match?.href || "/admin";
  });

  return (
    <aside
      className={`h-dvh w-[var(--sidebar-w)] shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar ${className}`}
    >
      <div className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-brand text-[11px] font-bold text-white">
          N
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-none text-ink">NAJIK</p>
          <p className="mt-0.5 truncate text-[9px] font-medium tracking-wide text-muted">EVERYTHING NEAR YOU</p>
        </div>
      </div>

      <nav className="admin-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {NAV.map((item) => {
          const isOpen = open === item.href;
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <div key={item.href}>
              <div className="flex items-center">
                <Link
                  href={item.href}
                  onClick={() => {
                    setOpen(item.href);
                    onNavigate?.();
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-[6px] text-[12px] ${
                    active && !item.children
                      ? "nav-active font-medium text-white"
                      : active
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-muted hover:bg-elevated hover:text-ink"
                  }`}
                >
                  <span className="opacity-80">{ICONS[item.icon]}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <CountBadge count={badges[item.href] || 0} />
                </Link>
                {item.children ? (
                  <button
                    type="button"
                    className="rounded p-1 text-faint hover:text-ink"
                    onClick={() => setOpen(isOpen ? "" : item.href)}
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                ) : null}
              </div>
              {item.children && isOpen ? (
                <div className="mb-1 ml-4 border-l border-line pl-2">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => onNavigate?.()}
                      className={`flex items-center gap-2 rounded px-1.5 py-1 text-[11px] ${
                        pathMatches(child.href, pathname, search)
                          ? "font-medium text-brand"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{child.label}</span>
                      <CountBadge count={badges[child.href] || 0} />
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-line px-2 py-2">
        <a
          href="mailto:ops@najik.com"
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-muted hover:bg-elevated hover:text-ink"
        >
          <LifeBuoy size={12} />
          Need help
        </a>
        <div className="mt-1 flex items-center justify-between px-2 text-[10px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Operational
          </span>
          <span>v2.5.0</span>
        </div>
      </div>
    </aside>
  );
}
