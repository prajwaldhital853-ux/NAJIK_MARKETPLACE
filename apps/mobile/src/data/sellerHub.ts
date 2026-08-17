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
  earnings: { title: "Earnings", sub: "Payouts, balance and this week", icon: "card", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/shop.jpg") },
  promotions: { title: "Promotions", sub: "Boost listings to the top", icon: "megaphone", color: "#EA580C", bg: "#FFF1E0", photo: require("../../assets/listings/building.jpg") },
  services: { title: "My Services", sub: "What you offer on NAJIK", icon: "briefcase", color: "#7C3AED", bg: "#F1E9FF", photo: require("../../assets/listings/tools.jpg") },
  saved: { title: "Saved Listings", sub: "Market watch from other sellers", icon: "bookmark", color: "#16A34A", bg: "#E7F6EC", photo: require("../../assets/listings/modern.jpg") },
  kyc: { title: "Verification & KYC", sub: "Stay trusted on NAJIK", icon: "shield-checkmark", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/jobs.jpg") },
  notifications: { title: "Notifications", sub: "Leads, visits and account alerts", icon: "notifications", color: "#2563EB", bg: "#E8F1FE", photo: require("../../assets/listings/flat.jpg") },
  messages: { title: "Messages", sub: "Chats with buyers nearby", icon: "mail", color: "#7C3AED", bg: "#F1E9FF", photo: require("../../assets/listings/apartment.jpg") },
  settings: { title: "Settings", sub: "Account, alerts and privacy", icon: "settings", color: "#4B5563", bg: "#F3F4F6", photo: require("../../assets/listings/office.jpg") },
  help: { title: "Help & Support", sub: "Guides, FAQs and contact", icon: "headset", color: "#EA580C", bg: "#FFF1E0", photo: require("../../assets/listings/services.jpg") },
  invite: { title: "Invite & Earn", sub: "Share NAJIK, earn credit", icon: "gift", color: "#1B7D2C", bg: "#E4F6EA", photo: require("../../assets/listings/land.jpg") },
};

export const sellerBookings = [
  { id: "b1", name: "Ramesh Yadav", job: "House visit · 3 BHK", when: "Today · 4:30 pm", where: "Lahan-3", status: "Upcoming" as const, pay: "Rs. 0", photo: require("../../assets/listings/house.jpg") },
  { id: "b2", name: "Sita Kumari", job: "Plumbing visit", when: "Tomorrow · 10:00 am", where: "Lahan Bazaar", status: "Upcoming" as const, pay: "Rs. 1,500", photo: require("../../assets/listings/tools.jpg") },
  { id: "b3", name: "Bikash Sah", job: "Shop walkthrough", when: "Thu · 11:30 am", where: "Main Road", status: "Confirmed" as const, pay: "Rs. 0", photo: require("../../assets/listings/shop.jpg") },
  { id: "b4", name: "Anita Magar", job: "Car inspection", when: "Mon · Done", where: "Golbazar", status: "Completed" as const, pay: "Rs. 800", photo: require("../../assets/listings/car.jpg") },
  { id: "b5", name: "Hari Sharma", job: "Land visit", when: "Sun · Cancelled", where: "Lahan-7", status: "Cancelled" as const, pay: "—", photo: require("../../assets/listings/land.jpg") },
];

export const sellerReviews = [
  { id: "r1", name: "Ramesh Yadav", rating: 5, text: "On time and very clear about the papers. Visit was easy to book on NAJIK.", time: "2 days ago", listing: "3 BHK Flat" },
  { id: "r2", name: "Sita Kumari", rating: 5, text: "Fixed the leak the same afternoon. Fair price.", time: "5 days ago", listing: "Plumbing Service" },
  { id: "r3", name: "Bikash Sah", rating: 4, text: "Good listing photos. Wish the parking note was bigger.", time: "1 week ago", listing: "Shop for Rent" },
  { id: "r4", name: "Anita Magar", rating: 5, text: "Honest about the car’s kilometres. Test drive was smooth.", time: "2 weeks ago", listing: "Honda Civic" },
];

export const weekBars = [
  { d: "Mon", v: 0.4, n: "4.2k" },
  { d: "Tue", v: 0.62, n: "6.1k" },
  { d: "Wed", v: 0.5, n: "5.0k" },
  { d: "Thu", v: 0.88, n: "8.8k" },
  { d: "Fri", v: 0.7, n: "7.1k" },
  { d: "Sat", v: 0.95, n: "9.4k" },
  { d: "Sun", v: 0.55, n: "5.4k" },
];

export const payouts = [
  { id: "p1", title: "Visit fees", amount: "+ Rs. 4,500", when: "15 Aug", ok: true },
  { id: "p2", title: "Boost · 3 BHK Flat", amount: "− Rs. 499", when: "14 Aug", ok: false },
  { id: "p3", title: "Plumbing job", amount: "+ Rs. 1,500", when: "12 Aug", ok: true },
  { id: "p4", title: "eSewa payout", amount: "− Rs. 8,000", when: "10 Aug", ok: false },
];

export const promoPacks = [
  { id: "g1", name: "Top of search", days: "7 days", price: "Rs. 499", reach: "3× views", popular: true },
  { id: "g2", name: "Homepage card", days: "3 days", price: "Rs. 299", reach: "Featured strip", popular: false },
  { id: "g3", name: "Urgent badge", days: "14 days", price: "Rs. 199", reach: "More calls", popular: false },
];

export const sellerServices = [
  { id: "sv1", title: "Property visits", sub: "Show homes and land", on: true, price: "Free with listing", photo: require("../../assets/listings/house.jpg") },
  { id: "sv2", title: "Home plumbing", sub: "Leak, tap, bathroom", on: true, price: "Rs. 1,500 /visit", photo: require("../../assets/listings/tools.jpg") },
  { id: "sv3", title: "Vehicle inspection", sub: "Local test drive", on: true, price: "Rs. 800", photo: require("../../assets/listings/car.jpg") },
  { id: "sv4", title: "Shop consultancy", sub: "Rent / sale walkthrough", on: false, price: "Rs. 1,000", photo: require("../../assets/listings/shop.jpg") },
];

export const sellerSaved = [
  { id: "ss1", title: "Corner shop · Main Road", price: "Rs. 18,000 /mo", where: "Lahan", photo: require("../../assets/listings/shop.jpg") },
  { id: "ss2", title: "Creta 2022 nearby", price: "Rs. 28,50,000", where: "Lahan-4", photo: require("../../assets/listings/car.jpg") },
  { id: "ss3", title: "Land 8 Katha", price: "Rs. 32,00,000", where: "Lahan-7", photo: require("../../assets/listings/land.jpg") },
];

export const kycSteps = [
  { id: "k1", title: "Phone & email", sub: "Verified at signup", done: true },
  { id: "k2", title: "Citizenship (nagrita)", sub: "Reviewed by NAJIK admin", done: true },
  { id: "k3", title: "Profile photo", sub: "Face matches ID", done: true },
  { id: "k4", title: "Service type", sub: "Real Estate & local services", done: true },
  { id: "k5", title: "Bank / eSewa", sub: "Add for payouts", done: false },
];

export const sellerNotes = [
  { id: "n1", title: "New inquiry on 3 BHK Flat", sub: "Ramesh wants a weekend visit", time: "10 min", unread: true, icon: "chatbubble" },
  { id: "n2", title: "Booking confirmed", sub: "Sita · plumbing tomorrow 10am", time: "1 hr", unread: true, icon: "calendar" },
  { id: "n3", title: "You got a 5★ review", sub: "Anita Magar · Honda Civic", time: "Yesterday", unread: false, icon: "star" },
  { id: "n4", title: "Boost ending soon", sub: "Homepage card expires in 8 hours", time: "Yesterday", unread: false, icon: "megaphone" },
  { id: "n5", title: "KYC reminder", sub: "Add eSewa to receive payouts", time: "2 days", unread: false, icon: "shield-checkmark" },
];

export const sellerThreads = [
  { id: "m1", name: "Ramesh Yadav", last: "Is the flat still free this Saturday?", time: "10m", unread: 2, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" },
  { id: "m2", name: "Sita Kumari", last: "I’ll be home after 10. Gate is blue.", time: "1h", unread: 0, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80" },
  { id: "m3", name: "Bikash Sah", last: "Thanks, see you at the shop.", time: "1d", unread: 0, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80" },
];

export const helpFaqs = [
  { q: "When can I post listings?", a: "After NAJIK admin verifies your nagrita and photo. Verified providers can post from the Post tab." },
  { q: "How do payouts work?", a: "Visit fees and jobs settle to your eSewa or bank once KYC bank details are added." },
  { q: "How do I boost a listing?", a: "Open Promotions, pick a pack, then choose which listing to feature." },
  { q: "Can buyers call me directly?", a: "Yes. Your number is shown on listings you publish. You can hide it in Settings." },
];
