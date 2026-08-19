"use client";

import { ListingModeration } from "@/components/admin/listing-moderation";

export default function PropertiesPage() {
  return (
    <ListingModeration
      title="Property Management"
      crumb="Dashboard / Properties / All properties"
      summary="Live real-estate listings from NAJIK sellers. Jobs, vehicles and services are reviewed in their own sections. Drafts stay on the seller app until they submit."
      defaultTab="Pending"
      category="property"
    />
  );
}
