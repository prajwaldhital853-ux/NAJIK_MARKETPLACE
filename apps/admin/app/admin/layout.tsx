"use client";

import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>{children}</Suspense>
    </AdminShell>
  );
}

