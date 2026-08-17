"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Maximize,
  Menu,
  MessageSquare,
  Minimize,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { ALERTS, INBOX, STAFF } from "@/lib/demo-data";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { Avatar } from "./ui";
import { CommandPalette } from "./command-palette";
import { AddModal } from "./add-modal";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { theme, toggle } = useTheme();
  const { staff, logout, loginAs } = useSession();
  const [cmd, setCmd] = useState(false);
  const [add, setAdd] = useState(false);
  const [bell, setBell] = useState(false);
  const [mail, setMail] = useState(false);
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);

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

        <IconBtn onClick={() => setBell((v) => !v)} badge={12}>
          <Bell size={15} />
        </IconBtn>
        <IconBtn onClick={() => setMail((v) => !v)} badge={5}>
          <MessageSquare size={15} />
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
        <Panel title="Notifications" onClose={() => setBell(false)}>
          {ALERTS.map((a) => (
            <a key={a.id} href={a.href} className="block border-b border-line px-4 py-3 hover:bg-elevated">
              <p className="text-sm text-ink">{a.title}</p>
              <p className="text-[11px] capitalize text-muted">{a.level}</p>
            </a>
          ))}
        </Panel>
      ) : null}

      {mail ? (
        <Panel title="Messages" onClose={() => setMail(false)}>
          {INBOX.map((m) => (
            <div key={m.id} className="flex gap-3 border-b border-line px-4 py-3">
              <Avatar name={m.from} />
              <div>
                <p className="text-sm font-medium text-ink">
                  {m.from} {m.unread ? <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red" /> : null}
                </p>
                <p className="text-xs text-muted">{m.preview}</p>
                <p className="mt-1 text-[11px] text-faint">{m.time}</p>
              </div>
            </div>
          ))}
        </Panel>
      ) : null}

      {menu ? (
        <Panel title="Signed in" onClose={() => setMenu(false)}>
          <div className="px-4 py-3 text-sm text-muted">
            {staff?.email}
            <div className="mt-3 space-y-1">
              {STAFF.filter((s) => s.status === "active").map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    loginAs(s.id);
                    setMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-elevated"
                >
                  <Avatar name={s.name} id={s.id} size={24} />
                  <span>
                    <span className="block text-ink">{s.name}</span>
                    <span className="text-[11px]">{s.role}</span>
                  </span>
                </button>
              ))}
            </div>
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
        className="admin-scroll absolute top-[var(--topbar-h)] right-3 max-h-[min(70vh,480px)] w-[300px] overflow-y-auto border border-line bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{title}</div>
        {children}
      </div>
    </div>
  );
}
