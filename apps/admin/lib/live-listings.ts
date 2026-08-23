import { formatNptDate, relativeTime } from "./format";
import type { Activity, Property } from "./demo-data";
import type { StaffListing } from "./staff-api";

function extraNum(row: StaffListing, key: string) {
  const extras = row.extras || {};
  const n = Number(extras[key]);
  return Number.isFinite(n) ? n : 0;
}

function extraText(row: StaffListing, key: string) {
  const extras = row.extras || {};
  const value = extras[key];
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

export function mapStaffListingToProperty(row: StaffListing): Property {
  const status =
    row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : row.status === "pending" ? "pending" : "pending";
  return {
    id: row.id,
    title: row.title,
    owner: row.owner_name || "Seller",
    ownerId: row.owner_id,
    type: extraText(row, "dealType") || row.subcategory || row.category,
    price: Number(String(row.price).replace(/\D/g, "")) || 0,
    location: row.location,
    status,
    featured: row.is_promoted,
    beds: extraNum(row, "beds"),
    baths: extraNum(row, "baths"),
    area: extraText(row, "area") ? `${extraText(row, "area")} sqft` : "",
    posted: relativeTime(row.created_at),
    views: extraNum(row, "views"),
  };
}

const ACTIVITY_BY_CATEGORY: Record<string, { type: string; typeColor: string; category: string }> = {
  property: { type: "New Property", typeColor: "#3d6b5a", category: "Property" },
  jobs: { type: "New Job", typeColor: "#5a6b52", category: "Jobs" },
  vehicles: { type: "Vehicle", typeColor: "#6b7054", category: "Vehicles" },
  services: { type: "Service", typeColor: "#167a38", category: "Services" },
  nearby: { type: "New Listing", typeColor: "#4a6356", category: "Nearby" },
  marketplace: { type: "Used item", typeColor: "#0F766E", category: "Used Items" },
  business: { type: "New Listing", typeColor: "#7a5c3a", category: "Shops" },
};

export function mapStaffListingActivity(row: StaffListing): Activity {
  const edit = Boolean(row.has_pending_edit);
  const meta = ACTIVITY_BY_CATEGORY[row.category] || ACTIVITY_BY_CATEGORY.property;
  return {
    id: `listing-${row.id}${edit ? "-edit" : ""}`,
    type: edit ? "Edit request" : meta.type,
    typeColor: edit ? "#b45309" : meta.typeColor,
    title: row.title,
    by: row.owner_name || "Seller",
    category: extraText(row, "dealType") || row.subcategory || meta.category,
    location: row.location,
    time: relativeTime(row.created_at),
    status: edit ? "Edit pending" : row.status.replace(/^\w/, (c) => c.toUpperCase()),
    at: Date.parse(row.created_at) || 0,
  };
}

export function listingPostedLabel(iso: string) {
  return formatNptDate(iso);
}
