"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/general-app-control", label: "Home & urgent sell" },
  { href: "/admin/general-app-control/legal-documents", label: "Terms & Privacy" },
  { href: "/admin/general-app-control/privacy-retention", label: "Privacy & retention" },
] as const;

export function AppControlSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex flex-wrap gap-2 border-b border-line pb-3" aria-label="General app control sections">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? "bg-brand text-white"
                : "bg-elevated text-muted hover:bg-card hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
