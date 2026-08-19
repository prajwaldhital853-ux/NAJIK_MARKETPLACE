"use client";

import { ListingModeration } from "@/components/admin/listing-moderation";

export default function ElectronicsPage() {
  return (
    <ListingModeration
      title="Electronics Management"
      crumb="Dashboard / Electronics / All gadgets"
      summary="Phones, laptops, appliances and other electronics posted in Used Items Marketplace. Approve before they appear under Electronics and Used Items in the buyer app."
      defaultTab="Pending"
      category="marketplace"
    />
  );
}
