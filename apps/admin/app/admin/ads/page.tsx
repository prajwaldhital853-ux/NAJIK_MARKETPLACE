"use client";

import { useSearchParams } from "next/navigation";
import { BoostAdsAdminPanel } from "@/components/admin/boost-ads-admin-panel";
import { PromotionRequestsPanel } from "@/components/admin/promotion-requests-panel";

export default function AdsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  return (
    <div className="space-y-2">
      <BoostAdsAdminPanel initialTab={status === "live" ? "active" : undefined} />
      <PromotionRequestsPanel />
    </div>
  );
}
