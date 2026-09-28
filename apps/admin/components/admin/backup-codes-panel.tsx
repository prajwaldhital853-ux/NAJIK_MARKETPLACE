"use client";

import { useState } from "react";
import { Copy, ShieldAlert } from "lucide-react";

type Props = {
  codes: string[];
  onContinue: () => void;
};

export function BackupCodesPanel({ codes, onContinue }: Props) {
  const [saved, setSaved] = useState(false);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-amber-soft px-4 py-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <div>
            <p className="text-[12px] font-semibold text-ink">Save your backup codes now</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              These three codes are shown only once. Any one code can reset your authenticator if you lose your phone.
            </p>
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {codes.map((code) => (
          <li
            key={code}
            className="flex items-center justify-between rounded-xl border border-line bg-elevated px-3 py-2.5"
          >
            <span className="font-mono text-[14px] font-semibold tracking-wide text-ink">{code}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
              onClick={() => void copy(code)}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </li>
        ))}
      </ul>
      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 size-4 accent-brand"
        />
        <span className="text-[11px] leading-5 text-ink">
          I have saved these backup codes. I understand they will not be shown again.
        </span>
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onContinue}
        className="w-full rounded-full bg-brand py-3 text-[13px] font-semibold text-white disabled:opacity-60"
      >
        Continue to admin panel
      </button>
    </div>
  );
}
