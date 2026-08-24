import { formatNptDate, relativeTime } from "./format";
import type { Activity, User } from "./demo-data";
import type { AppDirectoryUser } from "./staff-api";

export function mapDirectoryUser(row: AppDirectoryUser): User {
  const provider = row.account_type === "provider";
  const kyc = row.verification_status || "none";
  let status: User["status"] = "active";
  if (!row.is_active || row.account_status === "blocked") status = "blocked";
  else if (row.account_status === "deactivated") status = "deactivated";
  else if (kyc === "pending") status = "pending";
  else if (kyc === "verified") status = "verified";
  return {
    id: row.id,
    name: row.full_name || row.email || row.phone || "NAJIK user",
    email: row.email || "",
    phone: row.phone || "",
    city: row.address || "Nepal",
    role: provider ? "provider" : "buyer",
    status,
    joined: formatNptDate(row.date_joined),
    listings: row.listing_count ?? 0,
    lastActive: relativeTime(row.date_joined),
    kyc,
    category: provider ? row.service_type || "Provider" : "User",
    joinedAt: row.date_joined,
    staff_warning: row.staff_warning || "",
    photo_uri: row.photo_uri,
    avatar_uri: row.avatar_uri,
    nagrita_uri: row.nagrita_uri,
    nagrita_back_uri: row.nagrita_back_uri,
    nation_card_uri: row.nation_card_uri,
    other_document_uri: row.other_document_uri,
    application_id: row.application_id,
  };
}

export function mapDirectoryActivity(row: AppDirectoryUser): Activity {
  const provider = row.account_type === "provider";
  const kyc = row.verification_status || "none";
  return {
    id: `live-${row.id}`,
    type: provider ? "KYC" : "New User",
    typeColor: provider ? "#1b7d2c" : "#167a38",
    title: row.full_name || row.email || row.phone || "New account",
    by: "App signup",
    category: provider ? "Provider" : "User",
    location: row.address || "Nepal",
    time: relativeTime(row.date_joined),
    status: !row.is_active ? "Blocked" : kyc === "none" ? "Active" : kyc.replace(/^\w/, (c) => c.toUpperCase()),
    at: Date.parse(row.date_joined) || 0,
  };
}
