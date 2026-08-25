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
import { ReadOnlyBanner, usePageRbac } from "@/lib/use-page-rbac";

const TABS = [
  { id: "requests", label: "Add-fund requests", hint: "Approve offline bank payments" },
  { id: "wallets", label: "Wallets", hint: "Balances and manual fixes" },
  { id: "settings", label: "Fees & bank", hint: "Wallet fee and QR for top-ups" },
  { id: "refer", label: "Refer & Earn", hint: "Invite rewards and referral log" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type Audience = "provider" | "user";

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

function parseAudience(raw: string | null): Audience {
  if (raw === "user" || raw === "buyer") return "user";
  return "provider";
}

export function PaymentsHub() {
  const searchParams = useSearchParams();
  const { readOnly } = usePageRbac("seller_payments");
  const tabParam = searchParams.get("tab");
  const audience = parseAudience(searchParams.get("audience"));
  const active: TabId = isTab(tabParam) ? tabParam : "requests";

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getStaffPaymentsSummary>> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setSummary(await getStaffPaymentsSummary(undefined, audience));
    } catch {
      setSummary(null);
    }
  }, [audience]);

  useEffect(() => {
    void loadStats();
    const id = window.setInterval(() => void loadStats(), ADMIN_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadStats]);

  const activeMeta = useMemo(() => TABS.find((t) => t.id === active)!, [active]);
  const isBuyer = audience === "user";
  const audienceLabel = isBuyer ? "Buyer" : "Seller";

  const pendingCount = summary?.pending_load_count ?? 0;
  const walletCount = summary?.seller_wallet_count ?? 0;
  const walletTotal = summary?.total_wallet_balance_label ?? "Rs. 0";
  const referralEarned = summary?.referral_earned_label ?? "Rs. 0";
  const listingFee = summary?.listing_fee_label ?? "—";

  function audienceHref(nextAudience: Audience) {
    const params = new URLSearchParams();
    params.set("audience", nextAudience === "user" ? "buyer" : "seller");
    params.set("tab", active);
    return `/admin/payments?${params.toString()}`;
  }

  function tabHref(tab: TabId) {
    const params = new URLSearchParams();
    params.set("audience", isBuyer ? "buyer" : "seller");
    params.set("tab", tab);
    return `/admin/payments?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Payments & referrals"
        crumb="Dashboard / Payments"
        summary="Manage buyer and seller wallet balances, approve bank top-ups, set fees, and run Refer & Earn. All money moves offline — this panel is for records and approval only."
      />

      {readOnly ? <div className="mb-4"><ReadOnlyBanner label="Seller Payments" /></div> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <a
          href={audienceHref("provider")}
          className={`rounded-xl px-5 py-3 text-[15px] font-bold tracking-tight transition ${
            !isBuyer ? "bg-brand text-white shadow-sm" : "border border-line bg-card text-ink hover:bg-elevated"
          }`}
        >
          Seller
        </a>
        <a
          href={audienceHref("user")}
          className={`rounded-xl px-5 py-3 text-[15px] font-bold tracking-tight transition ${
            isBuyer ? "bg-brand text-white shadow-sm" : "border border-line bg-card text-ink hover:bg-elevated"
          }`}
        >
          Buyer
        </a>
      </div>

      <SummaryStrip
        items={[
          { label: `${audienceLabel} pending top-ups`, value: pendingCount, tone: pendingCount ? "amber" : "green" },
          {
            label: `${audienceLabel} wallet balance`,
            value: walletCount ? `${walletTotal} · ${walletCount} account${walletCount === 1 ? "" : "s"}` : walletTotal,
            tone: "brand",
          },
          { label: `${audienceLabel} referral earned`, value: referralEarned, tone: "green" },
          { label: isBuyer ? "Buyer wallet fee" : "Listing fee", value: listingFee, tone: "brand" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const on = tab.id === active;
          const badge = tab.id === "requests" && pendingCount > 0 ? pendingCount : null;
          return (
            <a
              key={tab.id}
              href={tabHref(tab.id)}
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

      {active === "requests" ? <SellerLoadRequestsPanel embedded audience={audience} onChanged={loadStats} /> : null}
      {active === "wallets" ? <SellerWalletsPanel embedded audience={audience} onChanged={loadStats} /> : null}
      {active === "settings" ? <SellerPaymentsConfigPanel embedded audience={audience} onChanged={loadStats} /> : null}
      {active === "refer" ? <ReferEarnAdminPanel embedded audience={audience} onChanged={loadStats} /> : null}
    </div>
  );
}
