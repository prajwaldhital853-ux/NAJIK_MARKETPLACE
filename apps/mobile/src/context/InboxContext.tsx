import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { fetchInbox, markInboxNotice, markInboxReadAll, type InboxNotice } from "../inboxApi";

const InboxCtx = createContext<{
  items: InboxNotice[];
  unread: number;
  refresh: () => Promise<void>;
  mark: (id: string, isRead: boolean) => Promise<void>;
  markAll: () => Promise<void>;
} | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxNotice[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const data = await fetchInbox();
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* keep last */
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const id = setInterval(() => void refresh(), 25000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refresh]);

  const mark = useCallback(async (id: string, isRead: boolean) => {
    const row = await markInboxNotice(id, isRead);
    setItems((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    setUnread((n) => Math.max(0, n + (isRead ? -1 : 1)));
  }, []);

  const markAll = useCallback(async () => {
    await markInboxReadAll();
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnread(0);
  }, []);

  const value = useMemo(() => ({ items, unread, refresh, mark, markAll }), [items, unread, refresh, mark, markAll]);
  return <InboxCtx.Provider value={value}>{children}</InboxCtx.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxCtx);
  if (!ctx) throw new Error("useInbox must be inside InboxProvider");
  return ctx;
}
