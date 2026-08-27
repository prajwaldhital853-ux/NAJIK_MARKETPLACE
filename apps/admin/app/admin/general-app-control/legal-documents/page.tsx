"use client";

import { PageHeader } from "@/components/admin/page-frame";
import { AppControlSubNav } from "@/components/admin/app-control-subnav";
import { LegalDocumentsPanel } from "@/components/admin/legal-documents-panel";
import { ReadOnlyBanner, useRbacGuard } from "@/lib/use-page-rbac";

export default function LegalDocumentsPage() {
  const { readOnly } = useRbacGuard("app_control");

  return (
    <div>
      <PageHeader
        title="Terms & Privacy"
        summary="Edit Terms & Conditions and Privacy Policy for buyers and sellers. Published content is served to the mobile app."
      />
      <AppControlSubNav />
      {readOnly ? (
        <div className="mb-4">
          <ReadOnlyBanner label="Terms & Privacy" />
        </div>
      ) : null}
      <LegalDocumentsPanel />
    </div>
  );
}
