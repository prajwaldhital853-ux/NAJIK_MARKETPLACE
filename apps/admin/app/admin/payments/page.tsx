"use client";

import { Suspense } from "react";
import { PaymentsHub } from "@/components/admin/payments-hub";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading payments…</p>}>
      <PaymentsHub />
    </Suspense>
  );
}
