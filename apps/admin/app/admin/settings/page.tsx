"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/page-frame";
import { Btn, Field, inputClass } from "@/components/admin/ui";
import { useTheme } from "@/lib/theme";
import { useAdmin } from "@/lib/store";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useAdmin();
  const [name, setName] = useState("NAJIK");
  const [support, setSupport] = useState("ops@najik.com");
  const [payout, setPayout] = useState("Friday 10:00–16:00 NPT");
  const [kycSla, setKycSla] = useState("24");
  const [autoVerify, setAutoVerify] = useState(false);
  const [featCap, setFeatCap] = useState("200");
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div>
      <PageHeader
        title="Settings"
        summary="Workspace, theme, KYC SLA and payout window for the NAJIK operations desk. Changes apply to this browser session (demo). Dark mode matches the product mockup; light mode uses the same layout with slate surfaces. Maintenance mode would freeze new seller posts on mobile."
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
          <Btn
            onClick={() => toast(`Saved ${name} · SLA ${kycSla}h · cap ${featCap}`)}
          >
            Save workspace
          </Btn>
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
          <p className="text-xs leading-relaxed text-muted">
            Version 2.5.0 · Clusters: api, workers, realtime — all operational. Demo passwords are listed on Staff.
            Provider queue remains at /admin/providers.
          </p>
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
      </div>
    </div>
  );
}
