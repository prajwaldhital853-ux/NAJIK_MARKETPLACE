"use client";

import { PageHeader } from "@/components/admin/page-frame";
import { AppControlSubNav } from "@/components/admin/app-control-subnav";
import { PrivacyRetentionPanel } from "@/components/admin/privacy-retention-panel";
import { ReadOnlyBanner, useRbacGuard } from "@/lib/use-page-rbac";

export default function PrivacyRetentionPage() {
  const { readOnly } = useRbacGuard("app_control");

  return (
    <div>
      <PageHeader
        title="Privacy & data retention"
        summary="GDPR-style retention windows, self-service export/delete toggles, and automated purge jobs."
      />
      <AppControlSubNav />
      {readOnly ? (
        <div className="mb-4">
          <ReadOnlyBanner label="Privacy & retention" />
        </div>
      ) : null}
      <PrivacyRetentionPanel />
    </div>
  );
}
