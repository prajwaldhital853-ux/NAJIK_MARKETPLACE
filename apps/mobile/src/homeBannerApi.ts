import { API_URL } from "./config";

export type HomeBanner = {
  image_url: string | null;
  updated_at?: string;
};

export async function fetchHomeBanner(): Promise<HomeBanner> {
  const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/app-control/home-banner/`);
  if (!res.ok) throw new Error("Could not load home banner.");
  return res.json() as Promise<HomeBanner>;
}
