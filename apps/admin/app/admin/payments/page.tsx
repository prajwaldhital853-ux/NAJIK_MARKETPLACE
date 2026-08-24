"use client";

import { Suspense } from "react";
import { AdminLoadingState } from "@/components/admin/page-frame";
import { PaymentsHub } from "@/components/admin/payments-hub";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<AdminLoadingState label="Loading payments…" />}>
      <PaymentsHub />
    </Suspense>
  );
}
