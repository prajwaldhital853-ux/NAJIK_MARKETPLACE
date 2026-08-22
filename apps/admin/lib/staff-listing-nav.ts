import type { StaffListing } from "./staff-api";

/** Admin page that opens the listing detail drawer for a row. */
export function staffListingDetailHref(row: Pick<StaffListing, "id" | "category">) {
  const cat = row.category;
  let base = "/admin/listing-queue";
  if (cat === "property") base = "/admin/properties";
  else if (cat === "jobs") base = "/admin/jobs";
  else if (cat === "services") base = "/admin/services";
  else if (cat === "nearby") base = "/admin/electronics";
  else if (cat === "marketplace") base = "/admin/listings?kind=used";
  else if (cat === "business") base = "/admin/listings?kind=shop";
  else if (cat === "vehicles") base = "/admin/listings?kind=vehicle";
  return `${base}?id=${row.id}`;
}
