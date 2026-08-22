import { api } from "./api";
import { withAppAuth } from "./authApi";

export type InboxNotice = {
  id: string;
  title: string;
  body: string;
  kind: "booking" | "message" | "listing" | "other";
  target: string;
  target_id: string;
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

export async function markInboxReadAll() {
  return withAppAuth((token) => api<{ ok: boolean }>("/api/notices/inbox/read-all/", { method: "POST", token }));
}
