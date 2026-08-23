import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { normTargetId, registerInboxDismissTarget } from "../inboxBridge";
import { useAuth } from "./AuthContext";
import {
  dismissInboxNotice,
  dismissInboxTarget,
  fetchInbox,
  markInboxNotice,
  markInboxReadAll,
  type InboxNotice,
} from "../inboxApi";

const InboxCtx = createContext<{
  items: InboxNotice[];
  unread: number;
  refresh: () => Promise<void>;
  mark: (id: string, isRead: boolean) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAll: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  dismissTarget: (payload: { target?: string; target_id?: string; kind?: string }) => Promise<void>;
} | null>(null);

function matchesDismissTarget(item: InboxNotice, payload: { target?: string; target_id?: string; kind?: string }) {
  if (payload.target && item.target !== payload.target) return false;
  if (payload.target_id) {
    const want = normTargetId(payload.target_id);
    const got = normTargetId(item.target_id);
    if (want && got !== want) return false;
  }
  if (payload.kind && item.kind !== payload.kind) return false;
  return true;
}

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
      setUnread(data.unread ?? data.items.filter((item) => !item.is_read).length);
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
    const id = setInterval(() => void refresh(), 10000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [refresh]);

  const dismiss = useCallback(async (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next;
    });
    try {
      const result = await dismissInboxNotice(id);
      setUnread(result.unread);
    } catch {
      await refresh();
    }
  }, [refresh]);

  const dismissTarget = useCallback(
    async (payload: { target?: string; target_id?: string; kind?: string }) => {
      const normalized = {
        ...payload,
        target_id: payload.target_id ? normTargetId(payload.target_id) : undefined,
      };
      setItems((prev) => prev.filter((item) => !matchesDismissTarget(item, normalized)));
      try {
        const result = await dismissInboxTarget(normalized);
        setUnread(result.unread);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const dismissTargetRef = useRef(dismissTarget);
  dismissTargetRef.current = dismissTarget;
  registerInboxDismissTarget((payload) => dismissTargetRef.current(payload));

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    setUnread((n) => Math.max(0, n - 1));
    try {
      const row = await markInboxNotice(id, true);
      setItems((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    } catch {
      await refresh();
    }
  }, [refresh]);

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnread(0);
    try {
      const result = await markInboxReadAll(false);
      setUnread(result.unread);
    } catch {
      await refresh();
    }
  }, [refresh]);

  const mark = useCallback(
    async (id: string, isRead: boolean) => {
      if (isRead) {
        await markRead(id);
        return;
      }
      const row = await markInboxNotice(id, false);
      setItems((prev) => prev.map((item) => (item.id === row.id ? row : item)));
      setUnread((n) => n + 1);
    },
    [markRead],
  );

  const value = useMemo(
    () => ({ items, unread, refresh, mark, markRead, markAll, dismiss, dismissTarget }),
    [items, unread, refresh, mark, markRead, markAll, dismiss, dismissTarget],
  );
  return <InboxCtx.Provider value={value}>{children}</InboxCtx.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxCtx);
  if (!ctx) throw new Error("useInbox must be inside InboxProvider");
  return ctx;
}

export function noticeSenderLabel(item: InboxNotice) {
  const name = (item.sender_name || "").trim();
  const bad = new Set(["New message", "Notification", "Booking request", "Someone"]);
  if (name && !bad.has(name)) return name;
  return "Someone";
}

export function noticeKindLabel(kind: InboxNotice["kind"]) {
  if (kind === "message") return "MESSAGE FROM";
  if (kind === "booking") return "BOOKING FROM";
  if (kind === "listing") return "LISTING FROM";
  return "FROM";
}
