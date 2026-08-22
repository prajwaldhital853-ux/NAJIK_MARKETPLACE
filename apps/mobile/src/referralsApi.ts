import { api } from "./api";
import { withAppAuth } from "./authApi";

export type ReferEarnStats = {
  invites_sent: number;
  joined: number;
  earned_count: number;
  earned_total: number;
  earned_total_label: string;
};

export type ReferEarnInvite = {
  id: string;
  name: string;
  status: "joined" | "earned";
  status_label: string;
  reward_amount: number;
  reward_label: string;
  joined_at: string;
  earned_at?: string | null;
};

export type ReferEarnMe = {
  invite_code: string;
  is_active: boolean;
  reward_amount: number;
  reward_label: string;
  description: string;
  stats: ReferEarnStats;
  recent: ReferEarnInvite[];
};

export async function fetchReferEarnMe() {
  return withAppAuth((token) => api<ReferEarnMe>("/api/auth/referrals/me/", { token }));
}
