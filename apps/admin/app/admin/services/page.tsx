"use client";

import { ListingModeration } from "@/components/admin/listing-moderation";

export default function ServicesPage() {
  return (
    <ListingModeration
      title="Service Management"
      crumb="Dashboard / Services / All services"
      summary="Local service listings from sellers registered as Local Services. Approve before they appear in the buyer services feed. Seller drafts are not shown here."
      defaultTab="Pending"
      category="services"
    />
  );
}
