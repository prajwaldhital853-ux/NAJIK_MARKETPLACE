export type Status =
  | "active"
  | "pending"
  | "verified"
  | "blocked"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled"
  | "failed"
  | "live"
  | "paused"
  | "open"
  | "under_review"
  | "resolved"
  | "flagged"
  | "hidden";

export type UserRole = "buyer" | "provider" | "seller";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: UserRole;
  status: "active" | "pending" | "verified" | "blocked" | "deactivated";
  joined: string;
  listings: number;
  lastActive: string;
  kyc: "none" | "pending" | "verified" | "rejected";
  category: string;
  joinedAt?: string;
  staff_warning?: string;
  photo_uri?: string | null;
  avatar_uri?: string | null;
  nagrita_uri?: string | null;
  nagrita_back_uri?: string | null;
  nation_card_uri?: string | null;
  other_document_uri?: string | null;
  application_id?: string | null;
};

export type Property = {
  id: string;
  title: string;
  owner: string;
  ownerId: string;
  type: string;
  price: number;
  location: string;
  status: "active" | "pending" | "approved" | "rejected" | "verified" | "blocked";
  featured: boolean;
  beds: number;
  baths: number;
  area: string;
  posted: string;
  views: number;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  owner: string;
  type: string;
  salary: string;
  location: string;
  status: "active" | "pending" | "approved" | "rejected";
  applicants: number;
  posted: string;
};

export type Service = {
  id: string;
  title: string;
  provider: string;
  providerId: string;
  category: string;
  rate: string;
  location: string;
  status: "active" | "pending" | "verified" | "rejected";
  rating: number;
  jobs: number;
  verified: boolean;
};

export type Gadget = {
  id: string;
  title: string;
  seller: string;
  brand: string;
  price: number;
  condition: string;
  location: string;
  status: "active" | "pending" | "approved" | "rejected";
  posted: string;
};

export type OtherListing = {
  id: string;
  title: string;
  kind: "vehicle" | "used" | "shop";
  seller: string;
  price: string;
  location: string;
  status: "active" | "pending" | "approved" | "rejected";
  posted: string;
};

export type Order = {
  id: string;
  service: string;
  buyer: string;
  provider: string;
  amount: number;
  city: string;
  status: "pending" | "active" | "completed" | "cancelled";
  when: string;
  slot: string;
};

export type Payment = {
  id: string;
  ref: string;
  party: string;
  method: string;
  amount: number;
  type: "booking" | "promo" | "payout" | "refund";
  status: "completed" | "pending" | "failed";
  time: string;
};

export type KycRow = {
  id: string;
  name: string;
  email: string;
  doc: string;
  city: string;
  submitted: string;
  status: "pending" | "verified" | "rejected";
  type: "user" | "provider" | "seller";
  notes: string;
};

export type Report = {
  id: string;
  title: string;
  reporter: string;
  against: string;
  category: string;
  location: string;
  severity: "low" | "medium" | "high";
  status: "open" | "under_review" | "resolved";
  time: string;
  detail: string;
};

export type Review = {
  id: string;
  listing: string;
  author: string;
  target: string;
  rating: number;
  text: string;
  city: string;
  status: "active" | "flagged" | "hidden";
  time: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  audience: string;
  channel: "push" | "email" | "in-app";
  status: "sent" | "scheduled" | "draft";
  time: string;
  reads: number;
};

export type Ad = {
  id: string;
  name: string;
  advertiser: string;
  placement: string;
  budget: number;
  spent: number;
  status: "live" | "paused" | "ended" | "pending";
  ctr: string;
  dates: string;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleKey: "super" | "ops" | "kyc" | "moderator" | "finance" | "support" | "ads";
  city: string;
  status: "active" | "invited" | "disabled";
  lastLogin: string;
  password: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
};

export const STAFF: Staff[] = [];
export const USERS: User[] = [];
export const PROPERTIES: Property[] = [];
export const JOBS: Job[] = [];
export const SERVICES: Service[] = [];
export const GADGETS: Gadget[] = [];
export const OTHERS: OtherListing[] = [];
export const ORDERS: Order[] = [];
export const PAYMENTS: Payment[] = [];
export const KYC: KycRow[] = [];
export const REPORTS: Report[] = [];
export const REVIEWS: Review[] = [];
export const NOTICES: Notice[] = [];
export const ADS: Ad[] = [];
export const INBOX: { id: string; from: string; preview: string; time: string; unread: boolean }[] = [];
export const ALERTS: { id: string; title: string; level: "warn" | "danger" | "info" | "ok"; href: string }[] = [];

export const PLATFORM_KPIS = {
  totalUsers: 0,
  activeUsers: 0,
  verifiedUsers: 0,
  blockedUsers: 0,
  pendingUsers: 0,
  propertyUsers: 0,
  jobUsers: 0,
  serviceUsers: 0,
  providers: 0,
  electronicUsers: 0,
  usedItemUsers: 0,
  shopUsers: 0,
  properties: 0,
  listings: 0,
  jobs: 0,
  vehicles: 0,
  usedItems: 0,
  shops: 0,
  electronics: 0,
  revenue: 0,
  revenueDelta: 0,
};

const EMPTY_GROWTH = [
  { m: "Jan", v: 0 },
  { m: "Feb", v: 0 },
  { m: "Mar", v: 0 },
  { m: "Apr", v: 0 },
  { m: "May", v: 0 },
  { m: "Jun", v: 0 },
];

export const GROWTH = {
  Users: EMPTY_GROWTH,
  Properties: EMPTY_GROWTH,
  Jobs: EMPTY_GROWTH,
  Services: EMPTY_GROWTH,
  Electronics: EMPTY_GROWTH,
};

export const REVENUE_BARS = Array.from({ length: 30 }, (_, i) => ({ d: `${i + 1}`, v: 0 }));

export const CATEGORY_SHARE = [
  { name: "Property", value: 0, count: 0, color: "#1b7d2c" },
  { name: "Jobs", value: 0, count: 0, color: "#3d6b5a" },
  { name: "Services", value: 0, count: 0, color: "#5a6b52" },
  { name: "Electronics", value: 0, count: 0, color: "#7a5c3a" },
  { name: "Used Items", value: 0, count: 0, color: "#4a6356" },
  { name: "Shops", value: 0, count: 0, color: "#6b7054" },
];

export type Activity = {
  id: string;
  type: string;
  typeColor: string;
  title: string;
  by: string;
  category: string;
  location: string;
  time: string;
  status: string;
  /** Epoch ms for sorting and date filters */
  at?: number;
};

export const ACTIVITY: Activity[] = [];
