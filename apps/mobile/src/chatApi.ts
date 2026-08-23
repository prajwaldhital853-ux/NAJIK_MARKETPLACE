import { api } from "./api";
import { withAppAuth } from "./authApi";
import { uuidFromNorm } from "./inboxBridge";

export type ChatParty = {
  id: string;
  full_name: string;
  account_type: "user" | "provider";
  last_seen: string | null;
  online: boolean;
};

export type ChatMessage = {
  id: string;
  kind: "text" | "image" | "voice" | "location" | "booking";
  text: string;
  lat: number | null;
  lng: number | null;
  location_label: string;
  created_at: string;
  read_at: string | null;
  image_url: string | null;
  voice_url: string | null;
  sender_id: string;
  mine: boolean;
};

export type ChatThread = {
  id: string;
  listing_id: string | null;
  listing_title: string;
  listing_price: string;
  listing_location: string;
  listing_photo: string | null;
  listing_sold?: boolean;
  contact_phone: string;
  created_at: string;
  updated_at: string;
  other: ChatParty;
  last_message: { id: string; kind: string; text: string; created_at: string; mine: boolean } | null;
  unread_count: number;
  blocked_by_me: boolean;
  blocked_me: boolean;
  i_am_buyer: boolean;
  messages: ChatMessage[] | null;
  quick_replies: string[];
};

export async function pingChatPresence(threadId?: string | null) {
  const id = threadId ? uuidFromNorm(threadId) : "";
  return withAppAuth((token) =>
    api<{ ok: boolean }>("/api/chat/presence/", {
      method: "POST",
      token,
      body: JSON.stringify({ thread_id: id }),
    }),
  );
}

export async function listChatThreads() {
  return withAppAuth((token) => api<ChatThread[]>("/api/chat/threads/", { token }));
}

export async function startListingChat(listingId: string) {
  return withAppAuth((token) =>
    api<ChatThread>("/api/chat/threads/", {
      method: "POST",
      token,
      body: JSON.stringify({ listing_id: listingId }),
    }),
  );
}

export async function fetchChatThread(id: string, since?: string) {
  const threadId = uuidFromNorm(id);
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  return withAppAuth((token) => api<ChatThread>(`/api/chat/threads/${threadId}/${qs}`, { token }));
}

export async function sendChatMessage(
  threadId: string,
  body: {
    kind: ChatMessage["kind"];
    text?: string;
    image?: string;
    voice?: string;
    lat?: number;
    lng?: number;
    location_label?: string;
  },
) {
  const id = uuidFromNorm(threadId);
  return withAppAuth((token) =>
    api<ChatMessage>(`/api/chat/threads/${id}/messages/`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),
  );
}

export async function blockChatThread(threadId: string) {
  const id = uuidFromNorm(threadId);
  return withAppAuth((token) =>
    api<ChatThread>(`/api/chat/threads/${id}/block/`, { method: "POST", token, body: JSON.stringify({}) }),
  );
}

export async function reportChatThread(threadId: string, reason: string, severity: "normal" | "high" = "normal") {
  const id = uuidFromNorm(threadId);
  return withAppAuth((token) =>
    api<{ id: string; status: string }>(`/api/chat/threads/${id}/report/`, {
      method: "POST",
      token,
      body: JSON.stringify({ reason, severity }),
    }),
  );
}

export async function fetchAuthedDataUri(url: string) {
  return withAppAuth(async (token) => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Could not load media.");
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read media."));
      reader.readAsDataURL(blob);
    });
  });
}
