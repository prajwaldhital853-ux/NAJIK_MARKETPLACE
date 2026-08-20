"use client";

import { useEffect, useState } from "react";
import { Briefcase, Calendar, IdCard, Mail, Phone, User } from "lucide-react";
import { fetchStaffImage, type ProviderIdCard } from "@/lib/staff-api";
import { formatNptDate } from "@/lib/format";

const GREEN = "#1B7D2C";
const GREEN_LIGHT = "#7AC943";

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
}: {
  uri?: string | null;
  className?: string;
  alt: string;
  fallbackSrc?: string;
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
    void fetchStaffImage(uri)
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
  return <img src={src} alt={alt} className={className} style={{ mixBlendMode: "multiply" }} />;
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

function FrontCard({ card }: { card: ProviderIdCard }) {
  const blocked = card.access_status !== "approved";
  const qr = card.qr_uri || card.public_qr_uri;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-sm">
      <svg className="pointer-events-none absolute right-0 top-0 h-[78px] w-full" viewBox="0 0 360 78" preserveAspectRatio="none" aria-hidden>
        <path d="M150 0 H360 V62 C295 78 210 70 150 0 Z" fill={GREEN} />
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

      <div className="relative z-[1] px-4 pb-2 pt-5 text-center">
        <p className="text-[18px] font-black tracking-[0.08em]">NAJIK</p>
        <p className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-muted">— EVERYTHING NEAR YOU —</p>
        <div className="mx-auto mt-3 h-[112px] w-[112px] overflow-hidden rounded-full border-[3px] border-[#1B7D2C]">
          <StaffImage uri={card.photo_uri} alt={card.full_name} className="h-full w-full object-cover !mix-blend-normal" />
        </div>
        <p className="mt-3 text-[16px] font-black uppercase tracking-wide">{card.full_name || "Seller"}</p>
        <p className="mt-1 text-[11px] font-bold uppercase" style={{ color: GREEN }}>
          Service Provider
        </p>
      </div>

      <div className="relative z-[1] px-5 pb-2">
        <DetailLine icon={<IdCard size={14} />} label="Provider ID" value={card.card_code} />
        <DetailLine icon={<Briefcase size={14} />} label="Category" value={card.category || "—"} />
        <DetailLine icon={<Phone size={14} />} label="Phone" value={phoneLabel(card.phone)} />
        <DetailLine icon={<Mail size={14} />} label="Email" value={card.email || "—"} />
        <DetailLine icon={<Calendar size={14} />} label="Joined On" value={joinedLabel(card.joined_on)} />
      </div>

      <div className="relative mt-1 h-[112px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 112" preserveAspectRatio="none" aria-hidden>
          <path d="M0 112 V48 C65 18 137 72 209 46 C281 22 324 38 360 28 V112 Z" fill={GREEN} />
          <path d="M0 112 V62 C72 36 144 78 216 54 C281 34 324 48 360 42 V112 Z" fill={GREEN_LIGHT} />
        </svg>
        <div className="relative z-[1] flex h-full items-end justify-between px-4 pb-3.5">
          <div className="h-16 w-16 overflow-hidden rounded-md bg-white p-1">
            <StaffImage uri={qr} alt="QR" className="h-full w-full object-contain !mix-blend-normal" />
          </div>
          <div className="flex min-w-[110px] flex-col items-center">
            <StaffImage
              uri={card.signature_uri}
              fallbackSrc="/id-card/authorized-signatory.png"
              alt="Authorized signatory"
              className="h-9 w-[110px] object-contain"
            />
            <div className="mt-1 mb-1 h-[1.5px] w-[108px] bg-[#1B7D2C]" />
            <p className="text-[10px] font-semibold text-ink">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function BackCard({ card }: { card: ProviderIdCard }) {
  const blocked = card.access_status !== "approved";
  const qr = card.qr_uri || card.public_qr_uri;

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
      <div className="bg-[#1B7D2C] px-4 py-7 text-center text-white">
        <p className="text-[18px] font-black tracking-[0.08em]">NAJIK</p>
        <p className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-white/90">EVERYTHING NEAR YOU</p>
      </div>
      <div className="m-3 overflow-hidden rounded-xl border border-line">
        <div className="bg-[#1B7D2C] px-3 py-2 text-[11px] font-bold text-white">TERMS & CONDITIONS</div>
        <div className="space-y-1 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <p>• This ID is property of NAJIK.</p>
          <p>• Non-transferable. Misuse may lead to account suspension.</p>
          <p>• Follow NAJIK marketplace terms at all times.</p>
          <p>• Return or destroy if your account is closed.</p>
        </div>
      </div>
      <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-line">
        <div className="bg-[#1B7D2C] px-3 py-2 text-[11px] font-bold text-white">EMERGENCY CONTACT</div>
        <div className="space-y-1 px-3 py-2.5 text-[12px] text-ink">
          <p>01-5970123</p>
          <p>support@najik.com</p>
        </div>
      </div>
      <div className="flex flex-col items-center px-4 pb-4 pt-1">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: GREEN }}>
          Scan to verify
        </p>
        <div className="h-32 w-32 overflow-hidden rounded-xl border-2 border-[#1B7D2C] bg-white p-1.5">
          <StaffImage uri={qr} alt="Verify QR" className="h-full w-full object-contain !mix-blend-normal" />
        </div>
        <p className="mt-2 text-[12px] font-black" style={{ color: GREEN }}>
          {card.is_verified ? "VERIFIED" : "PENDING"} · Valid ID
        </p>
      </div>
      <div className="bg-[#1B7D2C] py-2.5 text-center text-[12px] font-semibold text-white">www.najik.com</div>
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
