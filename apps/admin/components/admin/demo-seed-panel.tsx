"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Trash2 } from "lucide-react";
import { Btn } from "@/components/admin/ui";
import { fetchDemoSeedInfo, purgeDemoSeedData, seedDemoMarketplace } from "@/lib/staff-api";
import { useSession } from "@/lib/session";

export function DemoSeedPanel() {
  const { staff, apiSession } = useSession();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [totals, setTotals] = useState<{ sellers: number; listings: number } | null>(null);

  const isSuperAdmin = Boolean(staff?.isSuperAdmin);

  const loadInfo = useCallback(async () => {
    if (!apiSession || !isSuperAdmin) return;
    try {
      const info = await fetchDemoSeedInfo();
      setEnabled(info.enabled);
    } catch {
      setEnabled(false);
    }
  }, [apiSession, isSuperAdmin]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  if (!isSuperAdmin) return null;

  async function onSeed() {
    if (!enabled) {
      setProgress("Demo seed is disabled on the API. Set DEMO_SEED_ENABLED=true on Render, then redeploy.");
      return;
    }
    setBusy(true);
    setProgress("Starting demo seed (1000 listings)…");
    try {
      const result = await seedDemoMarketplace(
        (msg) => setProgress(msg),
        { totalSellers: 200, listingsPerSeller: 5, skipPhotos: true },
      );
      if (result) {
        setTotals({ sellers: result.total_demo_sellers, listings: result.total_demo_listings });
        setProgress(
          `Done. ${result.total_demo_listings} demo listings, ${result.total_demo_sellers} sellers. ` +
            `Sample seller login: +9779841234501 / demo123`,
        );
      }
    } catch (err) {
      setProgress(err instanceof Error ? err.message : "Demo seed failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onPurge() {
    if (!enabled) {
      setProgress("Demo seed is disabled on the API.");
      return;
    }
    if (!window.confirm("Delete all demo sellers and listings?")) return;
    setBusy(true);
    setProgress("Removing demo data…");
    try {
      const result = await purgeDemoSeedData();
      setTotals({ sellers: 0, listings: 0 });
      setProgress(`Removed ${result.removed_sellers} demo seller account(s).`);
    } catch (err) {
      setProgress(err instanceof Error ? err.message : "Purge failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-glow space-y-3 rounded-2xl border border-line bg-card p-5 lg:col-span-2">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Demo marketplace data</h2>
          <p className="mt-1 text-xs text-muted">
            Seed 1000 approved listings with Nepali names, addresses, and photos — no shell required.
            Super Admin only.
          </p>
        </div>
      </div>

      {enabled === false ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          API has demo seed <strong>disabled</strong>. On Render → Environment add{" "}
          <code className="rounded bg-white px-1">DEMO_SEED_ENABLED=true</code>, save, and redeploy.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Btn disabled={busy} onClick={() => void onSeed()}>
          {busy ? "Seeding…" : "Seed 1000 demo listings"}
        </Btn>
        <Btn kind="ghost" disabled={busy} onClick={() => void onPurge()}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Remove demo data
        </Btn>
      </div>

      {progress ? <p className="text-[12px] leading-relaxed text-muted">{progress}</p> : null}
      {totals ? (
        <p className="text-[11px] text-faint">
          Current totals: {totals.listings} listings · {totals.sellers} demo sellers
        </p>
      ) : null}
    </section>
  );
}
