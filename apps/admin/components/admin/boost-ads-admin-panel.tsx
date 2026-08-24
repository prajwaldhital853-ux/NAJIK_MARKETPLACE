"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, inputClass } from "./ui";
import {
  controlBoostCampaign,
  getBoostPricing,
  listBoostCampaigns,
  patchBoostPricing,
  type BoostCampaignRow,
  type BoostPricing,
} from "@/lib/staff-api";
import { formatNptDateTime } from "@/lib/format";
import { useAdmin } from "@/lib/store";

type Tab = "pricing" | "active" | "all";

export function BoostAdsAdminPanel({ initialTab }: { initialTab?: Tab }) {
  const { toast } = useAdmin();
  const [tab, setTab] = useState<Tab>(initialTab ?? "pricing");
  const [pricing, setPricing] = useState<BoostPricing | null>(null);
  const [campaigns, setCampaigns] = useState<BoostCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPricing = useCallback(async () => {
    const data = await getBoostPricing();
    setPricing(data);
  }, []);

  const loadCampaigns = useCallback(async (status: "active" | "all") => {
    const data = await listBoostCampaigns(status);
    setCampaigns(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPricing(), tab !== "pricing" ? loadCampaigns(tab) : Promise.resolve()])
      .catch((err) => toast(err instanceof Error ? err.message : "Failed to load boost data"))
      .finally(() => setLoading(false));
  }, [loadPricing, loadCampaigns, tab, toast]);

  const savePricing = async () => {
    if (!pricing) return;
    setSaving(true);
    try {
      const updated = await patchBoostPricing(pricing);
      setPricing(updated);
      toast("Boost pricing updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  const controlCampaign = async (campaignId: string, action: string, hours?: number) => {
    try {
      await controlBoostCampaign(campaignId, action, hours);
      toast(`Campaign ${action}${action.endsWith("e") ? "d" : "ed"}`);
      await loadCampaigns(tab === "all" ? "all" : "active");
    } catch (err) {
      toast(err instanceof Error ? err.message : `Failed to ${action} campaign`);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted">Loading boost ads…</div>;
  }

  const liveCount = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Wallet boost campaigns</h1>
          <p className="mt-1 text-sm text-muted">
            Sellers pay from wallet balance. Control pricing, live rotation slots, and campaign performance.
          </p>
        </div>
        {tab !== "pricing" ? (
          <p className="text-sm font-semibold text-brand">{liveCount} live in this view</p>
        ) : null}
      </div>

      <div className="flex gap-2 border-b border-line">
        <TabButton label="Pricing & settings" on={tab === "pricing"} onClick={() => setTab("pricing")} />
        <TabButton label="Live campaigns" on={tab === "active"} onClick={() => setTab("active")} />
        <TabButton label="All campaigns" on={tab === "all"} onClick={() => setTab("all")} />
      </div>

      {tab === "pricing" && pricing ? (
        <div className="space-y-6 rounded-lg border border-line bg-card p-6">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink">Package pricing (Rs)</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="3 days">
                <input type="number" className={inputClass} value={pricing.boost_3d_rupees} onChange={(e) => setPricing({ ...pricing, boost_3d_rupees: Number(e.target.value) })} />
              </Field>
              <Field label="7 days">
                <input type="number" className={inputClass} value={pricing.boost_7d_rupees} onChange={(e) => setPricing({ ...pricing, boost_7d_rupees: Number(e.target.value) })} />
              </Field>
              <Field label="14 days">
                <input type="number" className={inputClass} value={pricing.boost_14d_rupees} onChange={(e) => setPricing({ ...pricing, boost_14d_rupees: Number(e.target.value) })} />
              </Field>
              <Field label="30 days">
                <input type="number" className={inputClass} value={pricing.boost_30d_rupees} onChange={(e) => setPricing({ ...pricing, boost_30d_rupees: Number(e.target.value) })} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-ink">Limits & rotation</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Max active per seller">
                <input type="number" className={inputClass} value={pricing.max_active_boosts_per_seller} onChange={(e) => setPricing({ ...pricing, max_active_boosts_per_seller: Number(e.target.value) })} />
              </Field>
              <Field label="Max active per category">
                <input type="number" className={inputClass} value={pricing.max_active_boosts_per_category} onChange={(e) => setPricing({ ...pricing, max_active_boosts_per_category: Number(e.target.value) })} />
              </Field>
              <Field label="Max active platform-wide">
                <input type="number" className={inputClass} value={pricing.max_active_boosts_platform} onChange={(e) => setPricing({ ...pricing, max_active_boosts_platform: Number(e.target.value) })} />
              </Field>
              <Field label="Rotation interval (minutes)">
                <input type="number" className={inputClass} value={pricing.rotation_interval_minutes} onChange={(e) => setPricing({ ...pricing, rotation_interval_minutes: Number(e.target.value) })} />
              </Field>
              <Field label="Top slots per category feed">
                <input type="number" className={inputClass} value={pricing.max_slots_per_category_feed} onChange={(e) => setPricing({ ...pricing, max_slots_per_category_feed: Number(e.target.value) })} />
              </Field>
            </div>
          </section>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={pricing.is_active} onChange={(e) => setPricing({ ...pricing, is_active: e.target.checked })} className="h-4 w-4" />
            Boost promotions enabled for sellers
          </label>

          <div className="flex justify-end">
            <Btn kind="primary" onClick={() => void savePricing()} loading={saving} loadingLabel="Saving…">
              Save pricing & settings
            </Btn>
          </div>
        </div>
      ) : null}

      {(tab === "active" || tab === "all") && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="rounded-lg border border-line bg-card p-8 text-center text-muted">No campaigns found</div>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-lg border border-line bg-card p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{campaign.listing_title}</h3>
                    <p className="text-sm text-muted">
                      {campaign.listing_category} · {campaign.seller_name}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatNptDateTime(campaign.starts_at)} → {formatNptDateTime(campaign.ends_at)}
                    </p>
                  </div>
                  <StatusPill status={campaign.status} />
                </div>

                <div className="mb-3 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-muted">Duration</span>
                    <p className="font-semibold text-ink">{campaign.duration_days} days</p>
                  </div>
                  <div>
                    <span className="text-muted">Cost</span>
                    <p className="font-semibold text-ink">{campaign.price_paid_label}</p>
                  </div>
                  <div>
                    <span className="text-muted">Remaining</span>
                    <p className="font-semibold text-ink">
                      {campaign.status === "active" ? `${campaign.days_remaining}d` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Actual views</span>
                    <p className="font-semibold text-ink">{campaign.view_count}</p>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-3 rounded-lg bg-elevated p-3 text-center text-sm">
                  <div>
                    <p className="text-2xl font-bold text-brand">{campaign.impression_count}</p>
                    <p className="text-xs text-muted">Impressions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand">{campaign.view_count}</p>
                    <p className="text-xs text-muted">Detail views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-brand">{campaign.inquiry_count}</p>
                    <p className="text-xs text-muted">Inquiries</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {campaign.status === "active" ? (
                    <>
                      <Btn kind="ghost" onClick={() => void controlCampaign(campaign.id, "pause")}>Pause</Btn>
                      <Btn
                        kind="ghost"
                        onClick={() => {
                          const hours = prompt("Extend by how many hours?");
                          if (hours) void controlCampaign(campaign.id, "extend", Number(hours));
                        }}
                      >
                        Extend hours
                      </Btn>
                    </>
                  ) : null}
                  {campaign.status === "paused" ? (
                    <Btn kind="ghost" onClick={() => void controlCampaign(campaign.id, "resume")}>Resume</Btn>
                  ) : null}
                  <Btn
                    kind="danger"
                    onClick={() => {
                      if (confirm("Cancel this boost campaign?")) void controlCampaign(campaign.id, "cancel");
                    }}
                  >
                    Cancel
                  </Btn>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold ${on ? "border-b-2 border-brand text-brand" : "text-muted"}`}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-green-100 text-green-800"
      : status === "expired"
        ? "bg-gray-100 text-gray-600"
        : status === "paused"
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-800";
  return <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${cls}`}>{status}</span>;
}
