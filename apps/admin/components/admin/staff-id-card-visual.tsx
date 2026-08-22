"use client";

import { useEffect, useState } from "react";
import { Briefcase, Calendar, Globe, IdCard, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { fetchStaffImage, type ProviderIdCard } from "@/lib/staff-api";
import { formatNptDate } from "@/lib/format";

const GREEN = "#1B7D2C";
const GREEN_LIGHT = "#7AC943";

const TERMS = [
  "This ID card is the property of NAJIK.",
  "This card is non-transferable.",
  "Use of this ID card is subject to NAJIK's terms and conditions.",
  "If found, please return to NAJIK office or contact us.",
];

function phoneLabel(phone?: string) {
  if (!phone) return "—";
  return phone.startsWith("+") ? phone : `+977 ${phone}`;
}

function joinedLabel(iso?: string | null) {
  if (!iso) return "—";
  return formatNptDate(iso);
}

function StaffImage({
  uri,
  className,
  alt,
  fallbackSrc,
  blend,
}: {
  uri?: string | null;
  className?: string;
  alt: string;
  fallbackSrc?: string;
  blend?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(fallbackSrc || null);

  useEffect(() => {
    let alive = true;
    if (!uri) {
      setSrc(fallbackSrc || null);
      return;
    }
    if (!uri.includes("/api/")) {
      setSrc(uri);
      return;
    }
    // Prefer URI as-is when it already has cache-bust (?v=) for public branding images.
    const needsAuth = uri.includes("/api/admin/") || uri.includes("/api/verification/") || uri.includes("/api/cards/");
    if (!needsAuth && uri.includes("/api/branding/")) {
      setSrc(uri);
      return;
    }
    const bust = uri.includes("?") ? `${uri}&t=${Date.now()}` : `${uri}?t=${Date.now()}`;
    void fetchStaffImage(bust)
      .then((blobUrl) => {
        if (alive) setSrc(blobUrl || fallbackSrc || null);
      })
      .catch(() => {
        if (alive) setSrc(fallbackSrc || null);
      });
    return () => {
      alive = false;
    };
  }, [uri, fallbackSrc]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-[#E7F6EC] text-[#1B7D2C] ${className || ""}`}>
        <User size={28} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={blend ? { mixBlendMode: "multiply" } : undefined}
    />
  );
}

function DetailLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[#E8ECF0] py-2.5">
      <span className="text-[#1B7D2C]">{icon}</span>
      <span className="min-w-[86px] text-[12px] font-semibold text-ink">{label}:</span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink">{value}</span>
    </div>
  );
}

function SectionPill({ label }: { label: string }) {
  return (
    <div className="mx-auto w-fit rounded-full bg-[#1B7D2C] px-4 py-1.5">
      <p className="text-center text-[10px] font-bold tracking-[0.06em] text-white">{label}</p>
    </div>
  );
}

function FrontCard({ card }: { card: ProviderIdCard }) {
  const blocked = card.access_status !== "approved";
  const qr = card.qr_uri || card.public_qr_uri;
  const signKey = String(card.branding_updated_at || card.signature_uri || "");

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-sm">
      {/* Top-right brand corner — flush to card edges (SS2). */}
      <svg
        className="pointer-events-none absolute -right-px -top-px z-[1] h-[74px] w-[43%]"
        viewBox="0 0 140 72"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 0 C48 6 92 34 140 72 L140 66 C96 32 52 4 0 0 Z" fill={GREEN_LIGHT} />
        <path d="M0 0 H140 V72 C92 34 48 6 0 0 Z" fill={GREEN} />
      </svg>
      {blocked ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <p
              key={i}
              className="absolute left-[-10%] w-[140%] text-center text-[15px] font-black tracking-widest text-red/20"
              style={{ top: 24 + i * 44, transform: "rotate(-28deg)" }}
            >
              DOWNLOAD BLOCKED · DOWNLOAD BLOCKED · DOWNLOAD BLOCKED
            </p>
          ))}
        </div>
      ) : null}

      <div className="relative z-[2] px-4 pb-2 pt-4 text-center">
        <p className="text-[26px] font-black tracking-[0.1em]">NAJIK</p>
        <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-muted">— EVERYTHING NEAR YOU —</p>
        <div className="mx-auto mt-3 h-[112px] w-[112px] overflow-hidden rounded-full border-[3px] border-[#1B7D2C]">
          <StaffImage uri={card.photo_uri} alt={card.full_name} className="h-full w-full object-cover" />
        </div>
        <p className="mt-3 text-[16px] font-black uppercase tracking-wide">{card.full_name || "Seller"}</p>
        <p className="mt-1 text-[11px] font-bold uppercase" style={{ color: GREEN }}>
          Service Provider
        </p>
      </div>

      <div className="relative z-[2] px-5 pb-1">
        <DetailLine icon={<IdCard size={14} />} label="Provider ID" value={card.card_code} />
        <DetailLine icon={<Briefcase size={14} />} label="Category" value={card.category || "—"} />
        <DetailLine icon={<Phone size={14} />} label="Phone" value={phoneLabel(card.phone)} />
        <DetailLine icon={<Mail size={14} />} label="Email" value={card.email || "—"} />
        {card.membership_fee_label ? (
          <DetailLine icon={<Briefcase size={14} />} label="Plan fee" value={card.membership_fee_label} />
        ) : null}
        <DetailLine icon={<Calendar size={14} />} label="Joined On" value={joinedLabel(card.joined_on)} />
      </div>

      {/* Footer: QR in green (left), signature in white (right) — SS2. */}
      <div className="relative mt-2 h-[128px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 128" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 10 C79 -3 151 70 223 92 C281 110 324 118 360 122 L360 113 C324 109 281 100 223 82 C151 58 79 -10 0 3 Z"
            fill={GREEN_LIGHT}
          />
          <path
            d="M0 128 V10 C79 -3 151 70 223 92 C281 110 324 118 360 122 V128 Z"
            fill={GREEN}
          />
        </svg>
        <div className="absolute bottom-4 left-3.5 z-[1] h-[74px] w-[74px] overflow-hidden rounded-[10px] bg-white p-1.5">
          <StaffImage uri={qr} alt="QR" className="h-full w-full object-contain" />
        </div>
        <div className="absolute right-4 top-2 z-[2] flex min-w-[124px] flex-col items-center">
          <StaffImage
            key={signKey}
            uri={card.signature_uri}
            fallbackSrc="/id-card/authorized-signatory.png"
            alt="Authorized signatory"
            className="h-[42px] w-[120px] object-contain"
          />
          <div className="mb-1 mt-0.5 h-[1.5px] w-[112px] bg-[#1B7D2C]" />
          <p className="text-[10px] font-semibold text-ink">Authorized Signatory</p>
        </div>
      </div>
    </article>
  );
}

function BackCard({ card }: { card: ProviderIdCard }) {
  const blocked = card.access_status !== "approved";
  const qr = card.qr_uri || card.public_qr_uri;
  const phone = card.emergency_phone || "01-5970123";
  const email = card.emergency_email || "support@najik.com";
  const website = (card.website || "www.najik.com").replace(/^https?:\/\//, "");

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-sm">
      {blocked ? (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <p
              key={i}
              className="absolute left-[-10%] w-[140%] text-center text-[15px] font-black tracking-widest text-red/20"
              style={{ top: 24 + i * 44, transform: "rotate(-28deg)" }}
            >
              DOWNLOAD BLOCKED · DOWNLOAD BLOCKED · DOWNLOAD BLOCKED
            </p>
          ))}
        </div>
      ) : null}

      {/* Header with brand mark from SS1 */}
      <div className="relative bg-[#1B7D2C] px-4 pb-10 pt-5 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/id-card/back-brand.png"
          alt="NAJIK"
          className="relative mx-auto h-[108px] w-auto max-w-[220px] object-contain"
        />
        <svg className="absolute bottom-[-1px] left-0 w-full" viewBox="0 0 360 28" preserveAspectRatio="none" aria-hidden>
          <path d="M0 28 V14 C90 28 180 0 270 14 C315 21 340 18 360 12 V28 Z" fill="#fff" />
        </svg>
      </div>

      <div className="px-5 pb-2 pt-1">
        <SectionPill label="TERMS & CONDITIONS" />
        <ul className="mt-3 space-y-2">
          {TERMS.map((line) => (
            <li key={line} className="flex gap-2 text-[11px] leading-[15px] text-[#1F2937]">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1B7D2C]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="my-4 h-px bg-[#1B7D2C]"></div>

        <SectionPill label="EMERGENCY CONTACT" />
        <div className="mt-3 space-y-2 px-1">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
            <Phone size={14} className="text-[#1B7D2C]" />
            {phone}
          </p>
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
            <Mail size={14} className="text-[#1B7D2C]" />
            {email}
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <p className="mb-2 text-[12px] font-black tracking-[0.08em]" style={{ color: GREEN }}>
            SCAN TO VERIFY
          </p>
          <div className="h-[132px] w-[132px] overflow-hidden rounded-xl border-[2.5px] border-[#1B7D2C] bg-white p-1.5">
            <StaffImage uri={qr} alt="Verify QR" className="h-full w-full object-contain" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B7D2C] text-white">
              <ShieldCheck size={16} />
            </span>
            <div>
              <p className="text-[13px] font-black leading-none" style={{ color: GREEN }}>
                {card.is_verified ? "VERIFIED" : "PENDING"}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-ink">Valid ID</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with top curve */}
      <div className="relative mt-4 bg-[#1B7D2C] px-4 pb-3.5 pt-8 text-center text-white">
        <svg className="absolute left-0 top-[-1px] w-full" viewBox="0 0 360 28" preserveAspectRatio="none" aria-hidden>
          <path d="M0 0 V14 C90 0 180 28 270 14 C315 7 340 10 360 16 V0 Z" fill="#fff" />
        </svg>
        <p className="relative flex items-center justify-center gap-2 text-[12px] font-semibold">
          <Globe size={14} />
          {website}
        </p>
      </div>
    </article>
  );
}

export function StaffIdCardVisual({ card }: { card: ProviderIdCard }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FrontCard card={card} />
      <BackCard card={card} />
    </div>
  );
}
