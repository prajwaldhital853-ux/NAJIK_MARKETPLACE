import { api } from "./api";
import { withAppAuth } from "./authApi";
import { normTargetId } from "./inboxBridge";

export type InboxNotice = {
  id: string;
  title: string;
  body: string;
  kind: "booking" | "message" | "listing" | "other";
  target: string;
  target_id: string;
  sender_name?: string;
  is_read: boolean;
  created_at: string;
};

export async function fetchInbox() {
  return withAppAuth((token) => api<{ unread: number; items: InboxNotice[] }>("/api/notices/inbox/", { token }));
}

export async function markInboxNotice(id: string, isRead: boolean) {
  return withAppAuth((token) =>
    api<InboxNotice>(`/api/notices/inbox/${id}/`, {
      method: "POST",
      token,
      body: JSON.stringify({ is_read: isRead }),
    }),
  );
}

export async function dismissInboxNotice(id: string) {
  return withAppAuth((token) =>
    api<{ ok: boolean; id: string; unread: number }>(`/api/notices/inbox/${id}/`, {
      method: "POST",
      token,
      body: JSON.stringify({ dismiss: true }),
    }),
  );
}

export async function dismissInboxTarget(payload: { target?: string; target_id?: string; kind?: string }) {
  const body = {
    ...payload,
    target_id: payload.target_id ? normTargetId(payload.target_id) : undefined,
  };
  return withAppAuth((token) =>
    api<{ ok: boolean; deleted: number; unread: number }>("/api/notices/inbox/dismiss/", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),
  );
}

export async function markInboxReadAll(dismiss = false) {
  return withAppAuth((token) =>
    api<{ ok: boolean; deleted?: number; unread: number }>("/api/notices/inbox/read-all/", {
      method: "POST",
      token,
      body: JSON.stringify(dismiss ? { dismiss: true } : {}),
    }),
  );
}
