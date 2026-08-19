"use client";

import { ListingModeration } from "@/components/admin/listing-moderation";

export default function JobsPage() {
  return (
    <ListingModeration
      title="Job Management"
      crumb="Dashboard / Jobs / All jobs"
      summary="Job vacancy posts from sellers registered as Job Poster. Approve before they appear in the buyer jobs feed. Seller drafts are not shown here."
      defaultTab="Pending"
      category="jobs"
    />
  );
}
