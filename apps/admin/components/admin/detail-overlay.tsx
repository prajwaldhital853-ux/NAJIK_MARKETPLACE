"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStaffImage } from "@/lib/staff-api";

export type DetailDoc = { label: string; src?: string | null };

export function DetailOverlay({
  open,
  title,
  onClose,
  details,
  documents,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  details: React.ReactNode;
  documents?: DetailDoc[];
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <h3 className="truncate text-base font-semibold text-ink sm:text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-scroll grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-2">
          <section className="border-b border-line p-4 sm:p-5 lg:border-r lg:border-b-0">
            <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted uppercase">Details</p>
            {details}
          </section>
          <section className="p-4 sm:p-5">
            <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted uppercase">Documents</p>
            {documents?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {documents.map((doc) => (
                  <DocThumb key={`${doc.label}-${doc.src || "empty"}`} label={doc.label} src={doc.src} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No uploaded images.</p>
            )}
          </section>
        </div>

        {footer ? <div className="border-t border-line px-4 py-3 sm:px-5">{footer}</div> : null}
      </div>
    </div>
  );
}

function DocThumb({ label, src }: { label: string; src?: string | null }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!src) {
      setBlobUrl("");
      return;
    }
    let alive = true;
    let objectUrl = "";
    void fetchStaffImage(src).then((url) => {
      objectUrl = url;
      if (alive) setBlobUrl(url);
      else if (url) URL.revokeObjectURL(url);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return (
    <>
      <figure className="overflow-hidden rounded-xl border border-line bg-elevated">
        <figcaption className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</figcaption>
        {blobUrl ? (
          <button type="button" onClick={() => setLightbox(true)} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blobUrl} alt={label} className="h-36 w-full object-cover" />
          </button>
        ) : (
          <p className="px-2.5 pb-2.5 text-xs text-muted">{src ? "Loading…" : "Not uploaded"}</p>
        )}
      </figure>
      {lightbox && blobUrl ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blobUrl} alt={label} className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      ) : null}
    </>
  );
}

export function DetailKv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line/70 py-2 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value || "—"}</span>
    </div>
  );
}
