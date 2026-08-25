/** Default seeded staff logins — must match backend apps/staff/rbac_seed.py */
export const DEFAULT_STAFF_LOGINS = [
  { role: "Super Admin", email: "super@najik.com", password: "(set via create_super_admin)" },
  { role: "Admin", email: "staff-admin@najik.com", password: "Admin@1234" },
  { role: "Moderator", email: "moderator@najik.com", password: "Moderator@1234" },
  { role: "Verification Officer", email: "verification@najik.com", password: "Verify@1234" },
  { role: "Support Agent", email: "support@najik.com", password: "Support@1234" },
  { role: "Business Manager", email: "business@najik.com", password: "Business@1234" },
] as const;
