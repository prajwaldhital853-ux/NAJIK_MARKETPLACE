"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/page-frame";
import { Btn, Field, StatusBadge, inputClass } from "@/components/admin/ui";
import { useSession } from "@/lib/session";
import { useAdmin } from "@/lib/store";
import { UrgentSellAdminPanel } from "@/components/admin/urgent-sell-admin-panel";
import { PromotionRequestsPanel } from "@/components/admin/promotion-requests-panel";
import { ProviderPlansPanel } from "@/components/admin/provider-plans-panel";
import {
  SellerLoadRequestsPanel,
  SellerPaymentsConfigPanel,
  SellerWalletsPanel,
} from "@/components/admin/seller-payments-admin-panel";
import {
  createHomeBannerSlide,
  deleteHomeBannerSlide,
  fetchStaffImage,
  listHomeBannerSlides,
  patchHomeBannerSlide,
  type HomeBannerSlide,
} from "@/lib/staff-api";

const AUDIENCES = [
  { value: "all", label: "Buyers and sellers" },
  { value: "buyer", label: "Buyers only" },
  { value: "provider", label: "Sellers only" },
] as const;

async function fileToDataUri(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const type = file.type || "image/jpeg";
  return `data:${type};base64,${base64}`;
}

export default function GeneralAppControlPage() {
  const { apiSession, ready } = useSession();
  const { toast } = useAdmin();
  const [slides, setSlides] = useState<HomeBannerSlide[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!apiSession) return;
    setLoading(true);
    try {
      const rows = await listHomeBannerSlides();
      setSlides(rows);
      const next: Record<string, string> = {};
      for (const row of rows) {
        if (row.image_url) next[row.id] = await fetchStaffImage(row.image_url);
      }
      setPreviews(next);
      setError("");
    } catch (err) {
      setSlides([]);
      setPreviews({});
      setError(err instanceof Error ? err.message : "Could not load banners.");
    } finally {
      setLoading(false);
    }
  }, [apiSession]);

  useEffect(() => {
    if (!ready) return;
    if (!apiSession) {
      setLoading(false);
      setError("Sign in with a staff account to manage app controls.");
      return;
    }
    void load();
  }, [apiSession, ready, load]);

  const activeCount = slides.filter((s) => s.is_active).length;

  async function onPick(file: File | null) {
    if (!file) return;
    if (activeCount >= 3) {
      toast("Maximum 3 active banners. Delete or deactivate one first.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast("Image must be 4 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const image_uri = await fileToDataUri(file);
      await createHomeBannerSlide({ image_uri, audience, sort_order: activeCount });
      toast("Banner added. It appears on Home without users refreshing.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not upload banner.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSlide(id: string) {
    if (!window.confirm("Delete this banner?")) return;
    setBusy(true);
    try {
      await deleteHomeBannerSlide(id);
      toast("Banner deleted.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete banner.");
    } finally {
      setBusy(false);
    }
  }

  async function setAudienceFor(id: string, next: "all" | "buyer" | "provider") {
    try {
      await patchHomeBannerSlide(id, { audience: next });
      await load();
      toast("Audience updated.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update audience.");
    }
  }

  return (
    <div>
      <PageHeader
        title="General App Control"
        summary="Up to 3 home banners auto-scroll on buyer or seller Home. Pick who sees each banner. Changes appear in the app within about a minute without refresh."
      />
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}
      {loading && !error ? <p className="mb-4 text-sm text-muted">Loading app controls…</p> : null}

      <section className="rounded border border-line bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold text-ink">Home banners</h2>
            <p className="mt-1 text-[12px] text-muted">
              Wide banner (~16:9). Multiple banners rotate automatically on Home.
            </p>
          </div>
          <StatusBadge status={`${activeCount}/3 active`} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <div key={slide.id} className="rounded-xl border border-line bg-elevated p-2">
              {previews[slide.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[slide.id]} alt="" className="h-28 w-full rounded-lg object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-lg bg-card text-xs text-muted">No preview</div>
              )}
              <div className="mt-2 space-y-2 px-1">
                <Field label="Audience">
                  <select
                    className={inputClass}
                    value={slide.audience}
                    onChange={(e) => void setAudienceFor(slide.id, e.target.value as "all" | "buyer" | "provider")}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-2">
                  <Btn kind="danger" onClick={() => void removeSlide(slide.id)} disabled={busy}>Delete</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>

        {slides.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No banners yet. Home shows categories with no empty gap.</p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Audience for new banner">
            <select className={inputClass} value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Upload banner (max 3)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={inputClass}
              disabled={busy || activeCount >= 3}
              onChange={(e) => void onPick(e.target.files?.[0] || null)}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Btn kind="ghost" onClick={() => void load()} disabled={busy}>Refresh</Btn>
        </div>
      </section>

      <UrgentSellAdminPanel />
      <PromotionRequestsPanel />
      <ProviderPlansPanel />
      <SellerPaymentsConfigPanel />
      <SellerLoadRequestsPanel />
      <SellerWalletsPanel />
    </div>
  );
}
