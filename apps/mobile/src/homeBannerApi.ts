import { API_URL } from "./config";

export type HomeBannerAudience = "buyer" | "provider";

export type HomeBannerSlide = {
  id: string;
  image_url: string;
  audience: "all" | "buyer" | "provider";
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
};

export async function fetchHomeBanners(audience: HomeBannerAudience): Promise<HomeBannerSlide[]> {
  const base = API_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/app-control/home-banners/?audience=${audience}`);
  if (!res.ok) throw new Error("Could not load home banners.");
  const data = (await res.json()) as HomeBannerSlide[];
  return Array.isArray(data) ? data : [];
}
