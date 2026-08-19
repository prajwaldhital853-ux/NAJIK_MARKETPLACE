import { formatNptDate, relativeTime } from "./format";
import type { Activity, User } from "./demo-data";
import type { AppDirectoryUser } from "./staff-api";

export function mapDirectoryUser(row: AppDirectoryUser): User {
  const provider = row.account_type === "provider";
  const kyc = row.verification_status || "none";
  let status: User["status"] = "active";
  if (!row.is_active) status = "blocked";
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
    listings: 0,
    lastActive: relativeTime(row.date_joined),
    kyc,
    category: provider ? row.service_type || "Provider" : "User",
    joinedAt: row.date_joined,
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
  };
}
