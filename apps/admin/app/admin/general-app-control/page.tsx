"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/page-frame";
import { Btn, Field, inputClass } from "@/components/admin/ui";
import { useSession } from "@/lib/session";
import { useAdmin } from "@/lib/store";
import {
  deleteHomeBanner,
  fetchHomeBanner,
  fetchStaffImage,
  uploadHomeBanner,
  type HomeBannerPayload,
} from "@/lib/staff-api";

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
  const { apiSession } = useSession();
  const { toast } = useAdmin();
  const [banner, setBanner] = useState<HomeBannerPayload | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!apiSession) return;
    try {
      const data = await fetchHomeBanner();
      setBanner(data);
      setPreview(data.image_url ? await fetchStaffImage(data.image_url) : "");
      setError("");
    } catch (err) {
      setBanner(null);
      setPreview("");
      setError(err instanceof Error ? err.message : "Could not load banner.");
    }
  }, [apiSession]);

  useEffect(() => {
    if (!apiSession) {
      setError("Sign in with a staff account to manage app controls.");
      return;
    }
    void load();
  }, [apiSession, load]);

  async function onPick(file: File | null) {
    if (!file) return;
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
      const data = await uploadHomeBanner(image_uri);
      setBanner(data);
      setPreview(image_uri);
      toast("Buyer home banner updated.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not upload banner.");
    } finally {
      setBusy(false);
    }
  }

  async function removeBanner() {
    if (!window.confirm("Remove the buyer home banner? Buyers will see no banner slot on Home.")) return;
    setBusy(true);
    try {
      const data = await deleteHomeBanner();
      setBanner(data);
      setPreview("");
      toast("Banner removed.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove banner.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="General App Control"
        summary="Manage the buyer home promo banner. When empty, Home shows categories and listings with no blank gap."
      />
      {error ? <p className="mb-4 text-sm text-red">{error}</p> : null}

      <section className="rounded border border-line bg-card p-4">
        <h2 className="text-[13px] font-semibold text-ink">Buyer home banner</h2>
        <p className="mt-1 text-[12px] text-muted">
          Shown at the top of the buyer Home tab, below search. Recommended size: wide banner (~16:9), rounded corners match the app.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-elevated">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Home banner preview" className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted">No banner — buyers see no empty space</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Field label="Upload banner">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={inputClass}
              disabled={busy}
              onChange={(e) => void onPick(e.target.files?.[0] || null)}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Btn kind="ghost" onClick={() => void load()} disabled={busy}>Refresh</Btn>
          {banner?.image_url ? (
            <Btn kind="danger" onClick={() => void removeBanner()} disabled={busy}>Delete banner</Btn>
          ) : null}
        </div>
      </section>
    </div>
  );
}
