export type NavChild = { href: string; label: string };

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  children?: NavChild[];
};

export const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "layout" },
  {
    href: "/admin/users",
    label: "User Management",
    icon: "users",
    children: [
      { href: "/admin/users", label: "All users" },
      { href: "/admin/users?role=buyer", label: "Buyers" },
      { href: "/admin/users?role=provider", label: "Service providers" },
      { href: "/admin/users?status=blocked", label: "Blocked" },
      { href: "/admin/users?status=pending", label: "Pending" },
    ],
  },
  {
    href: "/admin/properties",
    label: "Property Management",
    icon: "home",
    children: [
      { href: "/admin/properties", label: "All properties" },
      { href: "/admin/properties?status=pending", label: "Pending approval" },
      { href: "/admin/properties?featured=1", label: "Featured" },
    ],
  },
  {
    href: "/admin/jobs",
    label: "Job Management",
    icon: "briefcase",
    children: [
      { href: "/admin/jobs", label: "All jobs" },
      { href: "/admin/jobs?status=pending", label: "Pending" },
      { href: "/admin/jobs?type=Full%20Time", label: "Full time" },
    ],
  },
  {
    href: "/admin/services",
    label: "Service Management",
    icon: "wrench",
    children: [
      { href: "/admin/services", label: "All services" },
      { href: "/admin/services?status=pending", label: "Pending" },
      { href: "/admin/services?verified=1", label: "Verified providers" },
    ],
  },
  {
    href: "/admin/electronics",
    label: "Electronics Management",
    icon: "smartphone",
    children: [
      { href: "/admin/electronics", label: "All gadgets" },
      { href: "/admin/electronics?status=pending", label: "Pending" },
    ],
  },
  {
    href: "/admin/listings",
    label: "Other Listings",
    icon: "layers",
    children: [
      { href: "/admin/listing-queue", label: "Pending approval" },
      { href: "/admin/listings", label: "All other" },
      { href: "/admin/listings?kind=vehicle", label: "Vehicles" },
      { href: "/admin/listings?kind=used", label: "Used items marketplace" },
      { href: "/admin/listings?kind=shop", label: "Shops" },
    ],
  },
  {
    href: "/admin/orders",
    label: "Orders & Bookings",
    icon: "calendar",
    children: [
      { href: "/admin/orders", label: "All bookings" },
      { href: "/admin/orders?status=pending", label: "Pending" },
      { href: "/admin/orders?status=completed", label: "Completed" },
    ],
  },
  {
    href: "/admin/payments",
    label: "Seller payments",
    icon: "wallet",
    children: [
      { href: "/admin/payments?tab=requests", label: "Add-fund requests" },
      { href: "/admin/payments?tab=wallets", label: "Seller wallets" },
      { href: "/admin/payments?tab=settings", label: "Fees & bank info" },
      { href: "/admin/payments?tab=refer", label: "Refer & Earn" },
    ],
  },
  {
    href: "/admin/providers",
    label: "KYC / Verification",
    icon: "shield",
    children: [
      { href: "/admin/providers?status=pending", label: "Pending" },
      { href: "/admin/providers?status=all", label: "All" },
      { href: "/admin/providers?status=active", label: "Active" },
      { href: "/admin/providers?status=rejected", label: "Rejected" },
      { href: "/admin/id-cards?status=requested", label: "ID card requests" },
      { href: "/admin/id-cards", label: "All ID cards" },
    ],
  },
  {
    href: "/admin/reports",
    label: "Reports & Complaints",
    icon: "flag",
    children: [
      { href: "/admin/reports", label: "All reports" },
      { href: "/admin/reports?section=buyer", label: "Buyer complain" },
      { href: "/admin/reports?section=seller", label: "Seller complain" },
      { href: "/admin/reports?section=chat", label: "From chat" },
      { href: "/admin/reports?severity=high", label: "High severity" },
    ],
  },
  {
    href: "/admin/reviews",
    label: "Reviews & Ratings",
    icon: "star",
    children: [
      { href: "/admin/reviews", label: "All reviews" },
      { href: "/admin/reviews?kind=hidden", label: "Hidden" },
    ],
  },
  { href: "/admin/notifications", label: "Notifications", icon: "bell" },
  {
    href: "/admin/ads",
    label: "Advertisements / Promotions",
    icon: "megaphone",
    children: [
      { href: "/admin/ads", label: "All campaigns" },
      { href: "/admin/ads?status=live", label: "Live" },
    ],
  },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
  {
    href: "/admin/general-app-control",
    label: "General App Control",
    icon: "sliders",
    children: [
      { href: "/admin/general-app-control", label: "Home & urgent sell" },
      { href: "/admin/general-app-control/legal-documents", label: "Terms & Privacy" },
      { href: "/admin/general-app-control/privacy-retention", label: "Privacy & retention" },
    ],
  },
  {
    href: "/admin/staff",
    label: "Admin & Staff Management",
    icon: "badge",
    children: [
      { href: "/admin/staff", label: "All staff" },
      { href: "/admin/staff?role=moderator", label: "Moderators" },
    ],
  },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];
