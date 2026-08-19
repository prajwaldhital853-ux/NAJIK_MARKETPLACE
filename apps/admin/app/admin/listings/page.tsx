"use client";

import { useSearchParams } from "next/navigation";
import { ListingModeration } from "@/components/admin/listing-moderation";

const KIND_CATEGORY: Record<string, string> = {
  vehicle: "vehicles",
  used: "marketplace",
  shop: "business",
};

export default function ListingsPage() {
  const params = useSearchParams();
  const kind = params.get("kind") || "";
  const category = KIND_CATEGORY[kind] || "vehicles,nearby,business";
  const label =
    kind === "vehicle" ? "Vehicles" : kind === "used" ? "Used Items Marketplace" : kind === "shop" ? "Shops" : "Other listings";
  const summary =
    kind === "used"
      ? "Electronics, furniture, phones, laptops, appliances, fashion, bikes, books, home items and other products. Approve before they appear in the buyer marketplace."
      : "Vehicles, nearby posts, shops and listings that are not property, jobs, local services or Used Items Marketplace.";
  return (
    <ListingModeration
      title={label}
      crumb={`Dashboard / Listings / ${label}`}
      summary={summary}
      defaultTab="Pending"
      category={category}
    />
  );
}
