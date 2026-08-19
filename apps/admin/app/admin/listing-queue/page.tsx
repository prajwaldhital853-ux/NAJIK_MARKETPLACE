"use client";

import { ListingModeration } from "@/components/admin/listing-moderation";

export default function ListingQueuePage() {
  return (
    <ListingModeration
      title="Listing approvals"
      crumb="Dashboard / Listings / Pending approval"
      summary="Pending listings waiting for approval across property, jobs, vehicles and services. Seller drafts are not shown here."
      defaultTab="Pending"
    />
  );
}
