export type SellerPage =
  | "bookings"
  | "reviews"
  | "earnings"
  | "promotions"
  | "services"
  | "saved"
  | "kyc"
  | "notifications"
  | "messages"
  | "settings"
  | "help"
  | "payments"
  | "add-fund"
  | "invite";

export const sellerPageMeta: Record<
  SellerPage,
  {
    title: string;
    sub: string;
    icon: string;
    color: string;
    bg: string;
    photo: number;
  }
> = {
  bookings: { title: "Bookings", sub: "Visits and jobs on your calendar", icon: "calendar", color: "#2563EB", bg: "#E8F1FE", photo: require("../../assets/listings/office.jpg") },
  reviews: { title: "Reviews", sub: "What customers say about you", icon: "star", color: "#EA580C", bg: "#FFF1E0", photo: require("../../assets/listings/house.jpg") },
  earnings: { title: "Earnings", sub: "Listing balance and fees", icon: "card", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/shop.jpg") },
  promotions: { title: "Promotions", sub: "Boost listings to the top", icon: "megaphone", color: "#EA580C", bg: "#FFF1E0", photo: require("../../assets/listings/building.jpg") },
  services: { title: "My Services", sub: "What you offer on NAJIK", icon: "briefcase", color: "#7C3AED", bg: "#F1E9FF", photo: require("../../assets/listings/tools.jpg") },
  saved: { title: "Saved Listings", sub: "Market watch from other sellers", icon: "bookmark", color: "#16A34A", bg: "#E7F6EC", photo: require("../../assets/listings/modern.jpg") },
  kyc: { title: "Verification & KYC", sub: "Stay trusted on NAJIK", icon: "shield-checkmark", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/jobs.jpg") },
  notifications: { title: "Notifications", sub: "Leads, visits and account alerts", icon: "notifications", color: "#2563EB", bg: "#E8F1FE", photo: require("../../assets/listings/flat.jpg") },
  messages: { title: "Messages", sub: "Chats with buyers nearby", icon: "mail", color: "#7C3AED", bg: "#F1E9FF", photo: require("../../assets/listings/apartment.jpg") },
  settings: { title: "Settings", sub: "Account, alerts and privacy", icon: "settings", color: "#4B5563", bg: "#F3F4F6", photo: require("../../assets/listings/office.jpg") },
  help: { title: "Help & Support", sub: "Guides, FAQs and contact", icon: "headset", color: "#EA580C", bg: "#FFF1E0", photo: require("../../assets/listings/services.jpg") },
  payments: { title: "Payments", sub: "Balance and transaction history", icon: "wallet", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/land.jpg") },
  "add-fund": { title: "Add funds", sub: "Bank transfer, QR and top-up request", icon: "add-circle", color: "#2563EB", bg: "#E8F1FE", photo: require("../../assets/listings/land.jpg") },
  invite: { title: "Invite & Earn", sub: "Share your code, earn when friends list", icon: "gift", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/land.jpg") },
};

export const sellerBookings: {
  id: string;
  name: string;
  job: string;
  when: string;
  where: string;
  status: "Upcoming" | "Confirmed" | "Completed" | "Cancelled";
  pay: string;
  photo: number;
}[] = [];

export const sellerReviews: { id: string; name: string; rating: number; text: string; time: string; listing: string }[] = [];

export const weekBars = [
  { d: "Mon", v: 0, n: "0" },
  { d: "Tue", v: 0, n: "0" },
  { d: "Wed", v: 0, n: "0" },
  { d: "Thu", v: 0, n: "0" },
  { d: "Fri", v: 0, n: "0" },
  { d: "Sat", v: 0, n: "0" },
  { d: "Sun", v: 0, n: "0" },
];

export const payouts: { id: string; title: string; amount: string; when: string; ok: boolean }[] = [];

export const promoPacks = [
  { id: "g1", name: "Top of search", days: "7 days", price: "Rs. 499", reach: "3× views", popular: true },
  { id: "g2", name: "Homepage card", days: "3 days", price: "Rs. 299", reach: "Featured strip", popular: false },
  { id: "g3", name: "Urgent badge", days: "14 days", price: "Rs. 199", reach: "More calls", popular: false },
];

export const sellerServices: { id: string; title: string; sub: string; on: boolean; price: string; photo: number }[] = [];

export const sellerSaved: { id: string; title: string; price: string; where: string; photo: number }[] = [];

export const kycSteps = [
  { id: "k1", title: "Phone & email", sub: "Verified at signup", done: false },
  { id: "k2", title: "Citizenship (nagrita)", sub: "Reviewed by NAJIK admin", done: false },
  { id: "k3", title: "Profile photo", sub: "Face matches ID", done: false },
  { id: "k4", title: "Service type", sub: "Set when you apply", done: false },
  { id: "k5", title: "Bank / eSewa", sub: "Add for payouts", done: false },
];

export const sellerNotes: { id: string; title: string; sub: string; time: string; unread: boolean; icon: string }[] = [];

export const sellerThreads: { id: string; name: string; last: string; time: string; unread: number; photo: string }[] = [];

export const helpFaqs = [
  { q: "When can I post listings?", a: "After NAJIK admin verifies your nagrita and photo. Verified providers can post from the Post tab." },
  { q: "How do payouts work?", a: "Visit fees and jobs settle to your eSewa or bank once KYC bank details are added." },
  { q: "How do I boost a listing?", a: "Open Promotions, pick a pack, then choose which listing to feature." },
  { q: "Can buyers call me directly?", a: "Yes. Your number is shown on listings you publish. You can hide it in Settings." },
];
