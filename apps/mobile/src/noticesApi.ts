import { api } from "./api";
import { withAppAuth } from "./authApi";

export type AppNotice = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "buyer" | "provider";
  audience_label?: string;
  image_uri?: string | null;
  is_active: boolean;
  created_at: string;
};

export async function fetchActiveNotices() {
  return withAppAuth((token) => api<AppNotice[]>("/api/notices/active/", { token }));
}
