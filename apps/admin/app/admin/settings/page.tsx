"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/page-frame";
import { Btn, Field, inputClass } from "@/components/admin/ui";
import { useTheme } from "@/lib/theme";
import { useAdmin } from "@/lib/store";
import { useSession } from "@/lib/session";
import { fetchBranding, fetchStaffImage, uploadSignatory } from "@/lib/staff-api";

async function fileToDataUri(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const type = file.type || "image/png";
  return `data:${type};base64,${base64}`;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useAdmin();
  const { apiSession } = useSession();
  const [name, setName] = useState("NAJIK");
  const [support, setSupport] = useState("ops@najik.com");
  const [payout, setPayout] = useState("Friday 10:00–16:00 NPT");
  const [kycSla, setKycSla] = useState("24");
  const [autoVerify, setAutoVerify] = useState(false);
  const [featCap, setFeatCap] = useState("200");
  const [maintenance, setMaintenance] = useState(false);
  const [signatoryPreview, setSignatoryPreview] = useState("/id-card/authorized-signatory.png");
  const [signBusy, setSignBusy] = useState(false);

  useEffect(() => {
    if (!apiSession) return;
    void fetchBranding()
      .then(async (data) => {
        if (!data.signatory_uri) return;
        const blob = await fetchStaffImage(data.signatory_uri);
        if (blob) setSignatoryPreview(blob);
        else setSignatoryPreview(data.signatory_uri);
      })
      .catch(() => {});
  }, [apiSession]);

  async function onSignatoryFile(file?: File | null) {
    if (!file) return;
    setSignBusy(true);
    try {
      const dataUri = await fileToDataUri(file);
      const saved = await uploadSignatory(dataUri);
      if (saved.signatory_uri) {
        const blob = await fetchStaffImage(saved.signatory_uri);
        setSignatoryPreview(blob || `${saved.signatory_uri}?t=${Date.now()}`);
      }
      toast("Authorized signatory updated for seller ID cards.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not upload signature.");
    } finally {
      setSignBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        summary="Workspace, theme, KYC SLA, ID card signatory and payout window for the NAJIK operations desk."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-glow space-y-3 rounded-2xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Workspace</h2>
          <Field label="Brand name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Ops email">
            <input className={inputClass} value={support} onChange={(e) => setSupport(e.target.value)} />
          </Field>
          <Field label="Payout window">
            <input className={inputClass} value={payout} onChange={(e) => setPayout(e.target.value)} />
          </Field>
          <Field label="KYC SLA (hours)">
            <input className={inputClass} value={kycSla} onChange={(e) => setKycSla(e.target.value)} />
          </Field>
          <Field label="Dashain featured cap">
            <input className={inputClass} value={featCap} onChange={(e) => setFeatCap(e.target.value)} />
          </Field>
          <Btn onClick={() => toast(`Saved ${name} · SLA ${kycSla}h · cap ${featCap}`)}>Save workspace</Btn>
        </section>

        <section className="card-glow space-y-4 rounded-2xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Appearance & flags</h2>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Theme</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold ${theme === "dark" ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"}`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold ${theme === "light" ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"}`}
              >
                Light
              </button>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm text-ink">
            Auto-verify providers on submit
            <input type="checkbox" checked={autoVerify} onChange={(e) => setAutoVerify(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-ink">
            Maintenance mode
            <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
          </label>
          <p className="text-xs leading-relaxed text-muted">Version 2.5.0 · Provider queue remains at /admin/providers.</p>
          <Btn
            kind="ghost"
            onClick={() =>
              toast(
                `${theme} theme · auto-verify ${autoVerify ? "on" : "off"} · maintenance ${maintenance ? "on" : "off"}`,
              )
            }
          >
            Apply flags
          </Btn>
        </section>

        <section className="card-glow space-y-3 rounded-2xl border border-line bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">ID card authorized signatory</h2>
          <p className="text-xs text-muted">
            This signature appears on every seller ID card front. Upload a PNG/JPEG to replace the current one.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-48 items-center justify-center rounded-xl border border-line bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatoryPreview}
                alt="Authorized signatory"
                className="max-h-full max-w-full object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={signBusy || !apiSession}
                onChange={(event) => void onSignatoryFile(event.target.files?.[0])}
                className="block text-sm text-ink"
              />
              <p className="text-[11px] text-muted">{signBusy ? "Uploading…" : "Recommended: black ink on white background."}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
