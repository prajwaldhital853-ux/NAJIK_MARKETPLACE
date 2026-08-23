"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Maximize,
  Menu,
  Minimize,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { useAdmin } from "@/lib/store";
import { OPEN_INBOX_KEY } from "@/lib/live-inbox";
import { Avatar } from "./ui";
import { CommandPalette } from "./command-palette";
import { AddModal } from "./add-modal";
import { InboxList } from "./inbox-list";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { theme, toggle } = useTheme();
  const { staff, logout } = useSession();
  const { inbox, inboxCount, inboxReady } = useAdmin();
  const [cmd, setCmd] = useState(false);
  const [add, setAdd] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!inboxReady) return;
    if (sessionStorage.getItem(OPEN_INBOX_KEY) !== "1") return;
    sessionStorage.removeItem(OPEN_INBOX_KEY);
    if (inboxCount > 0) {
      setBell(true);
      setMail(false);
      setMenu(false);
    }
  }, [inboxReady, inboxCount]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function toggleFull() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFull(true);
    } else {
      await document.exitFullscreen();
      setFull(false);
    }
  }

  return (
    <>
      <header className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:px-4">
        <button type="button" className="rounded border border-line bg-card p-1.5 text-muted lg:hidden" onClick={onMenu}>
          <Menu size={16} />
        </button>
        <button
          type="button"
          onClick={() => setCmd(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded border border-line bg-card px-2.5 py-1.5 text-[12px] text-muted"
        >
          <Search size={14} />
          <span className="truncate">Search users, listings, bookings…</span>
          <kbd className="ml-auto hidden rounded border border-line bg-elevated px-1.5 py-0.5 text-[10px] text-faint sm:inline">
            Ctrl K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setAdd(true)}
          className="hidden items-center gap-1 rounded bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white sm:flex"
        >
          <Plus size={14} />
          Add New
        </button>

        <IconBtn
          onClick={() => {
            setBell((v) => !v);
            setMenu(false);
          }}
          badge={inboxCount}
        >
          <Bell size={15} />
        </IconBtn>
        <IconBtn onClick={() => void toggleFull()}>{full ? <Minimize size={15} /> : <Maximize size={15} />}</IconBtn>
        <IconBtn onClick={toggle}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</IconBtn>

        <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded py-0.5 pl-0.5 pr-1.5 hover:bg-elevated">
          <Avatar name={staff?.name || "SA"} id={staff?.id} size={28} />
          <span className="hidden text-left sm:block">
            <span className="block text-[12px] font-medium text-ink">{staff?.name.split(" ")[0] || "Super Admin"}</span>
            <span className="block text-[10px] text-muted">{staff?.role || "Super Administrator"}</span>
          </span>
        </button>
      </header>

      {bell ? (
        <Panel title={`Notifications${inboxCount ? ` (${inboxCount})` : ""}`} onClose={() => setBell(false)}>
          <InboxList items={inbox} onOpen={() => setBell(false)} />
          <Link href="/admin/notifications" onClick={() => setBell(false)} className="block border-t border-line px-4 py-2.5 text-center text-[12px] font-semibold text-brand">
            Open notifications
          </Link>
        </Panel>
      ) : null}

      {menu ? (
        <Panel title="Signed in" onClose={() => setMenu(false)}>
          <div className="px-4 py-3 text-sm text-muted">
            {staff?.email}
            <button type="button" onClick={logout} className="mt-4 w-full rounded-xl border border-line py-2 text-sm font-semibold text-ink">
              Log out
            </button>
          </div>
        </Panel>
      ) : null}

      <CommandPalette open={cmd} onClose={() => setCmd(false)} />
      <AddModal open={add} onClose={() => setAdd(false)} />
    </>
  );
}

function IconBtn({
  children,
  onClick,
  badge,
}: {
  children: React.ReactNode;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button type="button" onClick={onClick} className="relative rounded border border-line bg-card p-1.5 text-muted hover:text-ink">
      {children}
      {badge ? (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="admin-scroll absolute top-[var(--topbar-h)] right-3 max-h-[min(70vh,480px)] w-[320px] overflow-y-auto border border-line bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{title}</div>
        {children}
      </div>
    </div>
  );
}
