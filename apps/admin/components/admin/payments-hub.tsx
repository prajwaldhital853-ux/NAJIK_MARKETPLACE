"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, SummaryStrip } from "@/components/admin/page-frame";
import { ReferEarnAdminPanel } from "@/components/admin/refer-earn-admin-panel";
import {
  SellerLoadRequestsPanel,
  SellerPaymentsConfigPanel,
  SellerWalletsPanel,
} from "@/components/admin/seller-payments-admin-panel";
import { getStaffPaymentsSummary } from "@/lib/staff-api";
import { ADMIN_POLL_MS } from "@/lib/live-inbox";

const TABS = [
  { id: "requests", label: "Add-fund requests", hint: "Approve offline bank payments" },
  { id: "wallets", label: "Seller wallets", hint: "Balances and manual fixes" },
  { id: "settings", label: "Fees & bank", hint: "Listing fee and QR for sellers" },
  { id: "refer", label: "Refer & Earn", hint: "Invite rewards and referral log" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function PaymentsHub() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const active: TabId = isTab(tabParam) ? tabParam : "requests";

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getStaffPaymentsSummary>> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setSummary(await getStaffPaymentsSummary());
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    const id = window.setInterval(() => void loadStats(), ADMIN_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadStats]);

  const activeMeta = useMemo(() => TABS.find((t) => t.id === active)!, [active]);

  const pendingCount = summary?.pending_load_count ?? 0;
  const walletCount = summary?.seller_wallet_count ?? 0;
  const walletTotal = summary?.total_wallet_balance_label ?? "Rs. 0";
  const referralEarned = summary?.referral_earned_label ?? "Rs. 0";
  const listingFee = summary?.listing_fee_label ?? "—";

  return (
    <div>
      <PageHeader
        title="Seller payments & referrals"
        crumb="Dashboard / Payments"
        summary="Manage seller listing balances, approve bank top-ups, set per-listing fees, and run Refer & Earn. All money moves offline — this panel is for records and approval only."
      />

      <SummaryStrip
        items={[
          { label: "Pending top-ups", value: pendingCount, tone: pendingCount ? "amber" : "green" },
          {
            label: "Seller wallet balance",
            value: walletCount ? `${walletTotal} · ${walletCount} seller${walletCount === 1 ? "" : "s"}` : walletTotal,
            tone: "brand",
          },
          { label: "Referral earned (paid)", value: referralEarned, tone: "green" },
          { label: "Listing fee", value: listingFee, tone: "brand" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const on = tab.id === active;
          const badge = tab.id === "requests" && pendingCount > 0 ? pendingCount : null;
          return (
            <a
              key={tab.id}
              href={`/admin/payments?tab=${tab.id}`}
              className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${
                on ? "border-brand bg-brand-soft text-brand" : "border-line bg-card text-ink hover:bg-elevated"
              }`}
            >
              {tab.label}
              {badge ? (
                <span className="ml-1.5 rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-bold text-ink">{badge}</span>
              ) : null}
            </a>
          );
        })}
      </div>

      <p className="mb-3 text-[12px] text-muted">{activeMeta.hint}</p>

      {active === "requests" ? <SellerLoadRequestsPanel embedded onChanged={loadStats} /> : null}
      {active === "wallets" ? <SellerWalletsPanel embedded onChanged={loadStats} /> : null}
      {active === "settings" ? <SellerPaymentsConfigPanel embedded onChanged={loadStats} /> : null}
      {active === "refer" ? <ReferEarnAdminPanel embedded onChanged={loadStats} /> : null}
    </div>
  );
}
