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
  status: "active" | "pending" | "verified" | "blocked";
  joined: string;
  listings: number;
  lastActive: string;
  kyc: "none" | "pending" | "verified" | "rejected";
  category: string;
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
};

export const STAFF: Staff[] = [
  { id: "st1", name: "Bikash Sharma", email: "admin@najik.com", role: "Super Administrator", roleKey: "super", city: "Kathmandu", status: "active", lastLogin: "Just now", password: "najikadmin" },
  { id: "st2", name: "Anisha Shrestha", email: "ops@najik.com", role: "Operations Manager", roleKey: "ops", city: "Lalitpur", status: "active", lastLogin: "12 mins ago", password: "najikops" },
  { id: "st3", name: "Hari Prasad Karki", email: "kyc@najik.com", role: "KYC Officer", roleKey: "kyc", city: "Kathmandu", status: "active", lastLogin: "1 hour ago", password: "najikkyc" },
  { id: "st4", name: "Puja Gurung", email: "mod@najik.com", role: "Content Moderator", roleKey: "moderator", city: "Pokhara", status: "active", lastLogin: "3 hours ago", password: "najikmod" },
  { id: "st5", name: "Nabin Thapa", email: "finance@najik.com", role: "Finance Lead", roleKey: "finance", city: "Kathmandu", status: "active", lastLogin: "Yesterday", password: "najikfin" },
  { id: "st6", name: "Sabina Magar", email: "support@najik.com", role: "Support Agent", roleKey: "support", city: "Biratnagar", status: "active", lastLogin: "22 mins ago", password: "najikhelp" },
  { id: "st7", name: "Dipesh Rai", email: "ads@najik.com", role: "Ads Manager", roleKey: "ads", city: "Kathmandu", status: "active", lastLogin: "4 hours ago", password: "najikads" },
  { id: "st8", name: "Sita Maharjan", email: "east@najik.com", role: "Regional Ops — East", roleKey: "ops", city: "Dharan", status: "active", lastLogin: "Today 8:10", password: "najikeast" },
  { id: "st9", name: "Ramesh Tamang", email: "kathmandu@najik.com", role: "Regional Ops — Valley", roleKey: "ops", city: "Kathmandu", status: "active", lastLogin: "Today 7:40", password: "najikktm" },
  { id: "st10", name: "Maya Limbu", email: "review@najik.com", role: "Listings Reviewer", roleKey: "moderator", city: "Lahan", status: "active", lastLogin: "2 days ago", password: "najikrev" },
  { id: "st11", name: "Kiran Basnet", email: "intern@najik.com", role: "Ops Intern", roleKey: "support", city: "Bhaktapur", status: "invited", lastLogin: "Never", password: "najikintern" },
  { id: "st12", name: "Asha Poudel", email: "night@najik.com", role: "Night Moderator", roleKey: "moderator", city: "Butwal", status: "disabled", lastLogin: "12 days ago", password: "najiknight" },
];

export const USERS: User[] = [
  { id: "u1", name: "Ramesh Tamang", email: "ramesh.tamang@gmail.com", phone: "9841-220011", city: "Kathmandu", role: "buyer", status: "active", joined: "12 Jan 2026", listings: 0, lastActive: "2 mins ago", kyc: "verified", category: "User" },
  { id: "u2", name: "Sita Maharjan", email: "sita.maharjan@gmail.com", phone: "9808-119922", city: "Lalitpur", role: "seller", status: "verified", joined: "03 Feb 2026", listings: 6, lastActive: "10 mins ago", kyc: "verified", category: "Property" },
  { id: "u3", name: "Hari Prasad", email: "hari.prasad@gmail.com", phone: "9815-334455", city: "Nepalgunj", role: "buyer", status: "active", joined: "18 Mar 2026", listings: 1, lastActive: "1 hour ago", kyc: "pending", category: "User" },
  { id: "u4", name: "Suresh Adhikari", email: "suresh.adhikari@gmail.com", phone: "9842-667788", city: "Biratnagar", role: "seller", status: "pending", joined: "02 Apr 2026", listings: 3, lastActive: "30 mins ago", kyc: "pending", category: "Electronics" },
  { id: "u5", name: "Anisha Shrestha", email: "anisha.s@gmail.com", phone: "9860-112233", city: "Kathmandu", role: "buyer", status: "active", joined: "22 Apr 2026", listings: 0, lastActive: "5 mins ago", kyc: "verified", category: "Jobs" },
  { id: "u6", name: "Bikash Karki", email: "bikash.karki@gmail.com", phone: "9801-445566", city: "Pokhara", role: "provider", status: "verified", joined: "09 May 2026", listings: 4, lastActive: "18 mins ago", kyc: "verified", category: "Services" },
  { id: "u7", name: "Puja Gurung", email: "puja.gurung@gmail.com", phone: "9821-778899", city: "Pokhara", role: "buyer", status: "active", joined: "16 May 2026", listings: 2, lastActive: "Yesterday", kyc: "none", category: "Used Items" },
  { id: "u8", name: "Nabin Thapa", email: "nabin.thapa@gmail.com", phone: "9849-223344", city: "Chitwan", role: "seller", status: "blocked", joined: "01 Jun 2026", listings: 8, lastActive: "12 days ago", kyc: "rejected", category: "Shops" },
  { id: "u9", name: "Sabina Magar", email: "sabina.magar@gmail.com", phone: "9816-556677", city: "Dharan", role: "provider", status: "pending", joined: "11 Jun 2026", listings: 1, lastActive: "3 hours ago", kyc: "pending", category: "Services" },
  { id: "u10", name: "Dipesh Rai", email: "dipesh.rai@gmail.com", phone: "9807-889900", city: "Lahan", role: "seller", status: "verified", joined: "20 Jun 2026", listings: 5, lastActive: "8 mins ago", kyc: "verified", category: "Vehicles" },
  { id: "u11", name: "Maya Limbu", email: "maya.limbu@gmail.com", phone: "9845-121212", city: "Birgunj", role: "buyer", status: "active", joined: "02 Jul 2026", listings: 0, lastActive: "Today", kyc: "verified", category: "User" },
  { id: "u12", name: "Kiran Basnet", email: "kiran.basnet@gmail.com", phone: "9812-343434", city: "Butwal", role: "seller", status: "active", joined: "14 Jul 2026", listings: 7, lastActive: "40 mins ago", kyc: "verified", category: "Property" },
  { id: "u13", name: "Asha Poudel", email: "asha.poudel@gmail.com", phone: "9861-565656", city: "Bhaktapur", role: "provider", status: "verified", joined: "21 Jul 2026", listings: 3, lastActive: "2 hours ago", kyc: "verified", category: "Services" },
  { id: "u14", name: "Gopal Yadav", email: "gopal.yadav@gmail.com", phone: "9803-787878", city: "Janakpur", role: "buyer", status: "pending", joined: "28 Jul 2026", listings: 0, lastActive: "4 hours ago", kyc: "pending", category: "User" },
  { id: "u15", name: "Rekha KC", email: "rekha.kc@gmail.com", phone: "9847-909090", city: "Itahari", role: "seller", status: "active", joined: "01 Aug 2026", listings: 2, lastActive: "6 mins ago", kyc: "none", category: "Electronics" },
  { id: "u16", name: "Sunil Bhattarai", email: "sunil.b@gmail.com", phone: "9818-101010", city: "Hetauda", role: "provider", status: "blocked", joined: "05 Aug 2026", listings: 1, lastActive: "9 days ago", kyc: "rejected", category: "Services" },
  { id: "u17", name: "Laxmi Dhakal", email: "laxmi.dhakal@gmail.com", phone: "9804-202020", city: "Kathmandu", role: "buyer", status: "verified", joined: "08 Aug 2026", listings: 0, lastActive: "14 mins ago", kyc: "verified", category: "Jobs" },
  { id: "u18", name: "Prakash Shrestha", email: "prakash.s@gmail.com", phone: "9840-303030", city: "Lalitpur", role: "seller", status: "active", joined: "10 Aug 2026", listings: 9, lastActive: "1 min ago", kyc: "verified", category: "Shops" },
  { id: "u19", name: "Binita Adhikari", email: "binita.a@gmail.com", phone: "9820-404040", city: "Pokhara", role: "buyer", status: "active", joined: "12 Aug 2026", listings: 1, lastActive: "20 mins ago", kyc: "pending", category: "Used Items" },
  { id: "u20", name: "Umesh Chaudhary", email: "umesh.c@gmail.com", phone: "9810-505050", city: "Nepalgunj", role: "seller", status: "pending", joined: "15 Aug 2026", listings: 2, lastActive: "Yesterday", kyc: "none", category: "Vehicles" },
];

export const PROPERTIES: Property[] = [
  { id: "p1", title: "Modern 3 BHK House", owner: "Sita Maharjan", ownerId: "u2", type: "House", price: 25000000, location: "Lalitpur", status: "pending", featured: true, beds: 3, baths: 2, area: "1,800 sqft", posted: "10 mins ago", views: 128 },
  { id: "p2", title: "2 BHK Flat for Rent", owner: "Kiran Basnet", ownerId: "u12", type: "Flat", price: 18000, location: "Kathmandu", status: "approved", featured: false, beds: 2, baths: 1, area: "850 sqft", posted: "1 hour ago", views: 86 },
  { id: "p3", title: "8 Katha Land for Sale", owner: "Prakash Shrestha", ownerId: "u18", type: "Land", price: 32000000, location: "Lahan", status: "active", featured: false, beds: 0, baths: 0, area: "8 Katha", posted: "3 hours ago", views: 210 },
  { id: "p4", title: "Apartment in Town", owner: "Sita Maharjan", ownerId: "u2", type: "Apartment", price: 45000000, location: "Bhaktapur", status: "approved", featured: true, beds: 3, baths: 2, area: "1,400 sqft", posted: "Yesterday", views: 340 },
  { id: "p5", title: "Shop Space for Rent", owner: "Prakash Shrestha", ownerId: "u18", type: "Commercial", price: 22000, location: "Lahan", status: "pending", featured: false, beds: 0, baths: 1, area: "700 sqft", posted: "Yesterday", views: 54 },
  { id: "p6", title: "Office Building", owner: "Kiran Basnet", ownerId: "u12", type: "Office", price: 85000000, location: "Lahan Bazaar", status: "verified", featured: false, beds: 0, baths: 4, area: "4 floors", posted: "2 days ago", views: 91 },
  { id: "p7", title: "Villa with Garden", owner: "Sita Maharjan", ownerId: "u2", type: "Villa", price: 85000000, location: "Pokhara", status: "approved", featured: true, beds: 4, baths: 3, area: "3,200 sqft", posted: "2 days ago", views: 412 },
  { id: "p8", title: "Studio near Ring Road", owner: "Rekha KC", ownerId: "u15", type: "Studio", price: 12000, location: "Kathmandu", status: "active", featured: false, beds: 1, baths: 1, area: "420 sqft", posted: "3 days ago", views: 67 },
  { id: "p9", title: "Corner Plot, Ward 7", owner: "Dipesh Rai", ownerId: "u10", type: "Land", price: 18000000, location: "Siraha", status: "pending", featured: false, beds: 0, baths: 0, area: "4 Katha", posted: "4 days ago", views: 33 },
  { id: "p10", title: "Family House, Lakeside", owner: "Bikash Karki", ownerId: "u6", type: "House", price: 42000000, location: "Pokhara", status: "approved", featured: true, beds: 5, baths: 3, area: "2,600 sqft", posted: "5 days ago", views: 501 },
  { id: "p11", title: "1 BHK for Students", owner: "Kiran Basnet", ownerId: "u12", type: "Flat", price: 9000, location: "Butwal", status: "rejected", featured: false, beds: 1, baths: 1, area: "380 sqft", posted: "6 days ago", views: 19 },
  { id: "p12", title: "Warehouse on Highway", owner: "Prakash Shrestha", ownerId: "u18", type: "Commercial", price: 55000, location: "Hetauda", status: "pending", featured: false, beds: 0, baths: 2, area: "6,000 sqft", posted: "1 week ago", views: 44 },
  { id: "p13", title: "Heritage Home, Patan", owner: "Sita Maharjan", ownerId: "u2", type: "House", price: 61000000, location: "Lalitpur", status: "active", featured: true, beds: 6, baths: 4, area: "2,900 sqft", posted: "1 week ago", views: 277 },
  { id: "p14", title: "Penthouse Baneshwor", owner: "Laxmi Dhakal", ownerId: "u17", type: "Apartment", price: 72000000, location: "Kathmandu", status: "approved", featured: false, beds: 4, baths: 3, area: "2,100 sqft", posted: "8 days ago", views: 188 },
  { id: "p15", title: "Farm House, Chitwan", owner: "Nabin Thapa", ownerId: "u8", type: "House", price: 28000000, location: "Chitwan", status: "blocked", featured: false, beds: 3, baths: 2, area: "1,600 sqft", posted: "10 days ago", views: 72 },
  { id: "p16", title: "New Build Townhouse", owner: "Kiran Basnet", ownerId: "u12", type: "House", price: 33500000, location: "Bhaktapur", status: "pending", featured: false, beds: 3, baths: 3, area: "1,550 sqft", posted: "12 days ago", views: 95 },
];

export const JOBS: Job[] = [
  { id: "j1", title: "Senior React Developer", company: "TechCorp Pvt. Ltd.", owner: "TechCorp Pvt. Ltd.", type: "Full Time", salary: "NPR 1,20,000 /mo", location: "Kathmandu", status: "approved", applicants: 48, posted: "15 mins ago" },
  { id: "j2", title: "Marketing Manager", company: "WebTech Solutions", owner: "Anisha Shrestha", type: "Full Time", salary: "NPR 45,000 /mo", location: "Lahan", status: "active", applicants: 22, posted: "30 mins ago" },
  { id: "j3", title: "School Teacher", company: "Sunrise Academy", owner: "Sunrise Academy", type: "Full Time", salary: "NPR 28,000 /mo", location: "Lahan-3", status: "pending", applicants: 11, posted: "2 hours ago" },
  { id: "j4", title: "Graphic Designer", company: "Pixel Studio", owner: "Puja Gurung", type: "Part Time", salary: "NPR 22,000 /mo", location: "Remote", status: "approved", applicants: 31, posted: "Yesterday" },
  { id: "j5", title: "Store Cashier", company: "Bazaar Mart", owner: "Prakash Shrestha", type: "Full Time", salary: "NPR 18,000 /mo", location: "Lahan", status: "active", applicants: 9, posted: "2 days ago" },
  { id: "j6", title: "Content Writer", company: "NAJIK Media", owner: "Laxmi Dhakal", type: "Remote", salary: "NPR 20,000 /mo", location: "Work from home", status: "approved", applicants: 40, posted: "3 days ago" },
  { id: "j7", title: "Delivery Rider", company: "QuickDrop", owner: "Dipesh Rai", type: "Part Time", salary: "NPR 25,000 /mo", location: "Biratnagar", status: "pending", applicants: 17, posted: "3 days ago" },
  { id: "j8", title: "Hotel Front Desk", company: "Lakeside Inn", owner: "Bikash Karki", type: "Full Time", salary: "NPR 24,000 /mo", location: "Pokhara", status: "active", applicants: 14, posted: "4 days ago" },
  { id: "j9", title: "Accountant", company: "Valley Traders", owner: "Sita Maharjan", type: "Full Time", salary: "NPR 35,000 /mo", location: "Lalitpur", status: "approved", applicants: 19, posted: "5 days ago" },
  { id: "j10", title: "Mobile Technician", company: "PhoneFix Hub", owner: "Rekha KC", type: "Full Time", salary: "NPR 22,000 /mo", location: "Itahari", status: "rejected", applicants: 3, posted: "6 days ago" },
  { id: "j11", title: "Nurse (Night Shift)", company: "City Care Hospital", owner: "Hari Prasad", type: "Full Time", salary: "NPR 40,000 /mo", location: "Nepalgunj", status: "pending", applicants: 8, posted: "1 week ago" },
  { id: "j12", title: "Sales Executive", company: "Himalayan Motors", owner: "Umesh Chaudhary", type: "Full Time", salary: "NPR 30,000 + incentive", location: "Nepalgunj", status: "active", applicants: 26, posted: "1 week ago" },
];

export const SERVICES: Service[] = [
  { id: "s1", title: "Plumbing — same day", provider: "Bikash Karki", providerId: "u6", category: "Home", rate: "NPR 1,500 /visit", location: "Pokhara", status: "verified", rating: 4.8, jobs: 142, verified: true },
  { id: "s2", title: "Home Cleaning", provider: "Asha Poudel", providerId: "u13", category: "Home", rate: "NPR 1,200 /visit", location: "Bhaktapur", status: "active", rating: 4.6, jobs: 88, verified: false },
  { id: "s3", title: "Electric Repair", provider: "Bikash Karki", providerId: "u6", category: "Home", rate: "NPR 800 /visit", location: "Pokhara", status: "verified", rating: 4.9, jobs: 201, verified: true },
  { id: "s4", title: "AC Installation", provider: "Sunil Bhattarai", providerId: "u16", category: "Home", rate: "NPR 2,500", location: "Hetauda", status: "pending", rating: 4.2, jobs: 19, verified: false },
  { id: "s5", title: "Wedding Photography", provider: "Puja Gurung", providerId: "u7", category: "Events", rate: "NPR 18,000 /day", location: "Pokhara", status: "verified", rating: 4.7, jobs: 36, verified: true },
  { id: "s6", title: "Math Tuition (SEE)", provider: "Anisha Shrestha", providerId: "u5", category: "Education", rate: "NPR 8,000 /mo", location: "Kathmandu", status: "active", rating: 4.9, jobs: 24, verified: true },
  { id: "s7", title: "Car Wash at Door", provider: "Dipesh Rai", providerId: "u10", category: "Auto", rate: "NPR 600", location: "Lahan", status: "pending", rating: 4.1, jobs: 11, verified: false },
  { id: "s8", title: "Catering for 50+", provider: "Sabina Magar", providerId: "u9", category: "Events", rate: "NPR 450 /plate", location: "Dharan", status: "pending", rating: 4.4, jobs: 7, verified: false },
  { id: "s9", title: "Laptop Repair", provider: "Rekha KC", providerId: "u15", category: "Tech", rate: "NPR 1,000", location: "Itahari", status: "verified", rating: 4.5, jobs: 63, verified: true },
  { id: "s10", title: "House Painting", provider: "Kiran Basnet", providerId: "u12", category: "Home", rate: "NPR 25 /sqft", location: "Butwal", status: "active", rating: 4.3, jobs: 15, verified: false },
  { id: "s11", title: "Yoga at Home", provider: "Laxmi Dhakal", providerId: "u17", category: "Health", rate: "NPR 3,500 /mo", location: "Kathmandu", status: "verified", rating: 4.8, jobs: 29, verified: true },
  { id: "s12", title: "Pest Control", provider: "Asha Poudel", providerId: "u13", category: "Home", rate: "NPR 2,200", location: "Bhaktapur", status: "rejected", rating: 3.6, jobs: 4, verified: false },
];

export const GADGETS: Gadget[] = [
  { id: "e1", title: "iPhone 14 Pro Max", seller: "Suresh Adhikari", brand: "Apple", price: 145000, condition: "Used — Excellent", location: "Biratnagar", status: "pending", posted: "30 mins ago" },
  { id: "e2", title: "Samsung S24 Ultra", seller: "Rekha KC", brand: "Samsung", price: 132000, condition: "New", location: "Itahari", status: "approved", posted: "1 hour ago" },
  { id: "e3", title: "MacBook Air M2", seller: "Prakash Shrestha", brand: "Apple", price: 118000, condition: "Used — Good", location: "Lalitpur", status: "active", posted: "3 hours ago" },
  { id: "e4", title: "Sony WH-1000XM5", seller: "Anisha Shrestha", brand: "Sony", price: 28000, condition: "New", location: "Kathmandu", status: "approved", posted: "Yesterday" },
  { id: "e5", title: "Canon EOS R50", seller: "Puja Gurung", brand: "Canon", price: 89000, condition: "Used — Excellent", location: "Pokhara", status: "pending", posted: "Yesterday" },
  { id: "e6", title: "Xiaomi Redmi Note 13", seller: "Hari Prasad", brand: "Xiaomi", price: 26500, condition: "New", location: "Nepalgunj", status: "active", posted: "2 days ago" },
  { id: "e7", title: "iPad 10th Gen", seller: "Laxmi Dhakal", brand: "Apple", price: 52000, condition: "Used — Good", location: "Kathmandu", status: "approved", posted: "2 days ago" },
  { id: "e8", title: "Dell XPS 13", seller: "Suresh Adhikari", brand: "Dell", price: 98000, condition: "Used — Fair", location: "Biratnagar", status: "rejected", posted: "3 days ago" },
  { id: "e9", title: "PlayStation 5 Disc", seller: "Nabin Thapa", brand: "Sony", price: 72000, condition: "Used — Excellent", location: "Chitwan", status: "pending", posted: "4 days ago" },
  { id: "e10", title: "DJI Mini 3 Drone", seller: "Dipesh Rai", brand: "DJI", price: 76000, condition: "New", location: "Lahan", status: "active", posted: "5 days ago" },
  { id: "e11", title: "Kindle Paperwhite", seller: "Maya Limbu", brand: "Amazon", price: 14500, condition: "Used — Good", location: "Birgunj", status: "approved", posted: "6 days ago" },
  { id: "e12", title: "LG 55\" OLED TV", seller: "Kiran Basnet", brand: "LG", price: 125000, condition: "New", location: "Butwal", status: "pending", posted: "1 week ago" },
];

export const OTHERS: OtherListing[] = [
  { id: "o1", title: "Hyundai Creta 2022", kind: "vehicle", seller: "Dipesh Rai", price: "NPR 28,50,000", location: "Lahan", status: "approved", posted: "20 mins ago" },
  { id: "o2", title: "Honda Civic 2018", kind: "vehicle", seller: "Umesh Chaudhary", price: "NPR 32,00,000", location: "Nepalgunj", status: "pending", posted: "2 hours ago" },
  { id: "o3", title: "Pulsar 150 Bike", kind: "vehicle", seller: "Hari Prasad", price: "NPR 1,45,000", location: "Siraha", status: "active", posted: "Yesterday" },
  { id: "o4", title: "Yamaha FZ-S", kind: "vehicle", seller: "Dipesh Rai", price: "NPR 1,85,000", location: "Lahan", status: "approved", posted: "2 days ago" },
  { id: "o5", title: "Teak Dining Set", kind: "used", seller: "Puja Gurung", price: "NPR 22,000", location: "Pokhara", status: "active", posted: "3 hours ago" },
  { id: "o6", title: "King Size Bed", kind: "used", seller: "Binita Adhikari", price: "NPR 18,500", location: "Pokhara", status: "pending", posted: "Yesterday" },
  { id: "o7", title: "Refrigerator Samsung", kind: "used", seller: "Maya Limbu", price: "NPR 28,000", location: "Birgunj", status: "approved", posted: "2 days ago" },
  { id: "o8", title: "Study Table + Chair", kind: "used", seller: "Gopal Yadav", price: "NPR 6,500", location: "Janakpur", status: "active", posted: "4 days ago" },
  { id: "o9", title: "Kirana Store — Sah", kind: "shop", seller: "Prakash Shrestha", price: "Open now", location: "Lahan", status: "approved", posted: "Just now" },
  { id: "o10", title: "Shop for Rent, Main Road", kind: "shop", seller: "Prakash Shrestha", price: "NPR 15,000 /mo", location: "Lahan", status: "pending", posted: "4 hours ago" },
  { id: "o11", title: "Mobile Repair Shop", kind: "shop", seller: "Rekha KC", price: "Open 8am–8pm", location: "Itahari", status: "active", posted: "Yesterday" },
  { id: "o12", title: "Clothing Store Corner", kind: "shop", seller: "Sita Maharjan", price: "NPR 20,000 /mo", location: "Golbazar", status: "approved", posted: "3 days ago" },
];

export const ORDERS: Order[] = [
  { id: "bk1", service: "Plumbing — leak repair", buyer: "Ramesh Tamang", provider: "Bikash Karki", amount: 1500, city: "Kathmandu", status: "pending", when: "Today 2:00 PM", slot: "Afternoon" },
  { id: "bk2", service: "Home Cleaning (3BHK)", buyer: "Laxmi Dhakal", provider: "Asha Poudel", amount: 2400, city: "Kathmandu", status: "active", when: "Today 4:30 PM", slot: "Evening" },
  { id: "bk3", service: "AC Installation", buyer: "Anisha Shrestha", provider: "Sunil Bhattarai", amount: 2500, city: "Hetauda", status: "completed", when: "Yesterday", slot: "Morning" },
  { id: "bk4", service: "Wedding Photography", buyer: "Sita Maharjan", provider: "Puja Gurung", amount: 18000, city: "Pokhara", status: "active", when: "22 Aug 2026", slot: "Full day" },
  { id: "bk5", service: "Math Tuition — Aug", buyer: "Hari Prasad", provider: "Anisha Shrestha", amount: 8000, city: "Kathmandu", status: "completed", when: "01 Aug 2026", slot: "Monthly" },
  { id: "bk6", service: "Car Wash at Door", buyer: "Maya Limbu", provider: "Dipesh Rai", amount: 600, city: "Lahan", status: "cancelled", when: "16 Aug 2026", slot: "Noon" },
  { id: "bk7", service: "Laptop Repair", buyer: "Gopal Yadav", provider: "Rekha KC", amount: 1800, city: "Itahari", status: "pending", when: "Tomorrow 11:00", slot: "Morning" },
  { id: "bk8", service: "House Painting quote", buyer: "Kiran Basnet", provider: "Kiran Basnet", amount: 45000, city: "Butwal", status: "pending", when: "25 Aug 2026", slot: "Site visit" },
  { id: "bk9", service: "Yoga at Home — pack", buyer: "Binita Adhikari", provider: "Laxmi Dhakal", amount: 3500, city: "Pokhara", status: "active", when: "This week", slot: "6:30 AM" },
  { id: "bk10", service: "Electric Repair", buyer: "Prakash Shrestha", provider: "Bikash Karki", amount: 800, city: "Lalitpur", status: "completed", when: "14 Aug 2026", slot: "Evening" },
  { id: "bk11", service: "Pest Control", buyer: "Rekha KC", provider: "Asha Poudel", amount: 2200, city: "Bhaktapur", status: "cancelled", when: "10 Aug 2026", slot: "Afternoon" },
  { id: "bk12", service: "Catering 80 plates", buyer: "Sabina Magar", provider: "Sabina Magar", amount: 36000, city: "Dharan", status: "active", when: "30 Aug 2026", slot: "Event" },
  { id: "bk13", service: "iPhone screen replace", buyer: "Ramesh Tamang", provider: "Rekha KC", amount: 4500, city: "Kathmandu", status: "completed", when: "08 Aug 2026", slot: "Walk-in" },
  { id: "bk14", service: "Villa viewing escort", buyer: "Laxmi Dhakal", provider: "Sita Maharjan", amount: 0, city: "Pokhara", status: "pending", when: "19 Aug 2026", slot: "11:00 AM" },
  { id: "bk15", service: "Car inspection", buyer: "Umesh Chaudhary", provider: "Dipesh Rai", amount: 1200, city: "Nepalgunj", status: "completed", when: "05 Aug 2026", slot: "Morning" },
];

export const PAYMENTS: Payment[] = [
  { id: "pay1", ref: "TXN-88421", party: "Ramesh Tamang", method: "eSewa", amount: 1500, type: "booking", status: "pending", time: "2 mins ago" },
  { id: "pay2", ref: "TXN-88418", party: "Laxmi Dhakal", method: "Khalti", amount: 2400, type: "booking", status: "completed", time: "18 mins ago" },
  { id: "pay3", ref: "TXN-88390", party: "TechCorp Pvt. Ltd.", method: "Bank transfer", amount: 12000, type: "promo", status: "completed", time: "1 hour ago" },
  { id: "pay4", ref: "TXN-88355", party: "Bikash Karki", method: "eSewa", amount: 1350, type: "payout", status: "completed", time: "3 hours ago" },
  { id: "pay5", ref: "TXN-88312", party: "Puja Gurung", method: "Khalti", amount: 16200, type: "payout", status: "pending", time: "Yesterday" },
  { id: "pay6", ref: "TXN-88201", party: "Maya Limbu", method: "Cash", amount: 600, type: "refund", status: "completed", time: "Yesterday" },
  { id: "pay7", ref: "TXN-88170", party: "Suresh Adhikari", method: "IME Pay", amount: 4999, type: "promo", status: "failed", time: "2 days ago" },
  { id: "pay8", ref: "TXN-88111", party: "Anisha Shrestha", method: "eSewa", amount: 8000, type: "booking", status: "completed", time: "2 days ago" },
  { id: "pay9", ref: "TXN-88090", party: "Asha Poudel", method: "Bank transfer", amount: 2160, type: "payout", status: "completed", time: "3 days ago" },
  { id: "pay10", ref: "TXN-88044", party: "Nabin Thapa", method: "Khalti", amount: 0, type: "refund", status: "failed", time: "4 days ago" },
  { id: "pay11", ref: "TXN-87980", party: "Rekha KC", method: "eSewa", amount: 1800, type: "booking", status: "completed", time: "5 days ago" },
  { id: "pay12", ref: "TXN-87910", party: "Dipesh Rai", method: "IME Pay", amount: 540, type: "payout", status: "pending", time: "5 days ago" },
  { id: "pay13", ref: "TXN-87800", party: "Prakash Shrestha", method: "Bank transfer", amount: 25000, type: "promo", status: "completed", time: "1 week ago" },
  { id: "pay14", ref: "TXN-87750", party: "Sabina Magar", method: "Khalti", amount: 32400, type: "booking", status: "pending", time: "1 week ago" },
  { id: "pay15", ref: "TXN-87620", party: "Hari Prasad", method: "eSewa", amount: 800, type: "booking", status: "failed", time: "8 days ago" },
];

export const KYC: KycRow[] = [
  { id: "k1", name: "Hari Prasad", email: "hari.prasad@gmail.com", doc: "Citizenship · 12-01-75-04321", city: "Nepalgunj", submitted: "1 hour ago", status: "pending", type: "user", notes: "Selfie match pending" },
  { id: "k2", name: "Suresh Adhikari", email: "suresh.adhikari@gmail.com", doc: "Citizenship · 05-02-71-11990", city: "Biratnagar", submitted: "3 hours ago", status: "pending", type: "provider", notes: "Nagrita photo slightly cropped" },
  { id: "k3", name: "Sabina Magar", email: "sabina.magar@gmail.com", doc: "Citizenship · 10-01-74-33210", city: "Dharan", submitted: "Yesterday", status: "pending", type: "provider", notes: "Service type: catering" },
  { id: "k4", name: "Gopal Yadav", email: "gopal.yadav@gmail.com", doc: "Citizenship · 17-03-69-22110", city: "Janakpur", submitted: "Yesterday", status: "pending", type: "user", notes: "Address mismatch with GPS" },
  { id: "k5", name: "Binita Adhikari", email: "binita.a@gmail.com", doc: "Citizenship · 04-02-76-00881", city: "Pokhara", submitted: "2 days ago", status: "pending", type: "user", notes: "Clear scan" },
  { id: "k6", name: "Umesh Chaudhary", email: "umesh.c@gmail.com", doc: "Citizenship · 22-01-70-44002", city: "Nepalgunj", submitted: "3 days ago", status: "pending", type: "provider", notes: "Vehicle dealer papers attached" },
  { id: "k7", name: "Ramesh Tamang", email: "ramesh.tamang@gmail.com", doc: "Citizenship · 26-01-68-10021", city: "Kathmandu", submitted: "12 Jan 2026", status: "verified", type: "user", notes: "OK" },
  { id: "k8", name: "Sita Maharjan", email: "sita.maharjan@gmail.com", doc: "Citizenship · 27-01-72-20045", city: "Lalitpur", submitted: "03 Feb 2026", status: "verified", type: "provider", notes: "Property seller" },
  { id: "k9", name: "Bikash Karki", email: "bikash.karki@gmail.com", doc: "Citizenship · 41-01-73-30012", city: "Pokhara", submitted: "09 May 2026", status: "verified", type: "provider", notes: "Licensed electrician" },
  { id: "k10", name: "Nabin Thapa", email: "nabin.thapa@gmail.com", doc: "Citizenship · 35-01-67-01992", city: "Chitwan", submitted: "01 Jun 2026", status: "rejected", type: "seller", notes: "Altered document suspected" },
  { id: "k11", name: "Sunil Bhattarai", email: "sunil.b@gmail.com", doc: "Citizenship · 44-01-74-05551", city: "Hetauda", submitted: "05 Aug 2026", status: "rejected", type: "provider", notes: "Face does not match nagrita" },
  { id: "k12", name: "Asha Poudel", email: "asha.poudel@gmail.com", doc: "Citizenship · 27-01-75-07770", city: "Bhaktapur", submitted: "21 Jul 2026", status: "verified", type: "provider", notes: "OK" },
];

export const REPORTS: Report[] = [
  { id: "r1", title: "Fake Listing Report", reporter: "Hari Prasad", against: "Nabin Thapa · Farm House", category: "Property", location: "Nepalgunj", severity: "high", status: "under_review", time: "1 hour ago", detail: "Photos reused from another site. Price looks unrealistic for Chitwan." },
  { id: "r2", title: "Abusive chat", reporter: "Maya Limbu", against: "Sunil Bhattarai", category: "Services", location: "Hetauda", severity: "medium", status: "open", time: "3 hours ago", detail: "Provider sent insulting messages after a cancelled booking." },
  { id: "r3", title: "Wrong category", reporter: "Anisha Shrestha", against: "iPhone 14 Pro Max", category: "Electronics", location: "Biratnagar", severity: "low", status: "open", time: "5 hours ago", detail: "Posted under Property by mistake." },
  { id: "r4", title: "Duplicate job post", reporter: "Laxmi Dhakal", against: "TechCorp Pvt. Ltd.", category: "Jobs", location: "Kathmandu", severity: "low", status: "resolved", time: "Yesterday", detail: "Same role posted 4 times in 2 days." },
  { id: "r5", title: "Unsafe meetup spot", reporter: "Binita Adhikari", against: "King Size Bed", category: "Used Items", location: "Pokhara", severity: "high", status: "open", time: "Yesterday", detail: "Seller asked to meet on a highway at night." },
  { id: "r6", title: "Payment not received", reporter: "Bikash Karki", against: "Booking bk3", category: "Payments", location: "Hetauda", severity: "high", status: "under_review", time: "2 days ago", detail: "Job marked completed but payout still pending." },
  { id: "r7", title: "Spam promotions", reporter: "Ramesh Tamang", against: "Kirana Store — Sah", category: "Shops", location: "Lahan", severity: "medium", status: "open", time: "2 days ago", detail: "Daily blast of unrelated ads in chat." },
  { id: "r8", title: "Stolen bike suspected", reporter: "Hari Prasad", against: "Pulsar 150 Bike", category: "Vehicles", location: "Siraha", severity: "high", status: "under_review", time: "3 days ago", detail: "Engine number does not match papers." },
  { id: "r9", title: "Fake reviews", reporter: "Asha Poudel", against: "Yoga at Home", category: "Reviews", location: "Kathmandu", severity: "medium", status: "open", time: "4 days ago", detail: "Five 5-star reviews from new accounts in one hour." },
  { id: "r10", title: "Off-platform deal", reporter: "Sabina Magar", against: "Wedding Photography", category: "Services", location: "Pokhara", severity: "low", status: "resolved", time: "5 days ago", detail: "Provider asked to pay cash outside NAJIK." },
  { id: "r11", title: "Misleading salary", reporter: "Gopal Yadav", against: "Store Cashier", category: "Jobs", location: "Lahan", severity: "medium", status: "open", time: "6 days ago", detail: "Job listed NPR 18k, interviewer said NPR 12k." },
  { id: "r12", title: "ID used without consent", reporter: "Kiran Basnet", against: "Unknown account", category: "KYC", location: "Butwal", severity: "high", status: "under_review", time: "1 week ago", detail: "Citizenship photo appears on another pending KYC." },
];

export const REVIEWS: Review[] = [
  { id: "rv1", listing: "Plumbing — same day", author: "Ramesh Tamang", target: "Bikash Karki", rating: 5, text: "Came in 40 minutes and fixed the leak. Fair price.", city: "Kathmandu", status: "active", time: "2 hours ago" },
  { id: "rv2", listing: "Modern 3 BHK House", author: "Laxmi Dhakal", target: "Sita Maharjan", rating: 4, text: "House is as pictured. Owner was a bit slow to reply.", city: "Lalitpur", status: "active", time: "5 hours ago" },
  { id: "rv3", listing: "iPhone 14 Pro Max", author: "Hari Prasad", target: "Suresh Adhikari", rating: 2, text: "Battery health 78% not disclosed. Asking for return.", city: "Biratnagar", status: "flagged", time: "Yesterday" },
  { id: "rv4", listing: "Senior React Developer", author: "Anisha Shrestha", target: "TechCorp Pvt. Ltd.", rating: 3, text: "Interview was fine but they ghosted after assignment.", city: "Kathmandu", status: "active", time: "Yesterday" },
  { id: "rv5", listing: "Home Cleaning", author: "Maya Limbu", target: "Asha Poudel", rating: 5, text: "Spotless. Will book again before Dashain.", city: "Bhaktapur", status: "active", time: "2 days ago" },
  { id: "rv6", listing: "Hyundai Creta 2022", author: "Umesh Chaudhary", target: "Dipesh Rai", rating: 4, text: "Car is genuine. Negotiation took time.", city: "Lahan", status: "active", time: "2 days ago" },
  { id: "rv7", listing: "Wedding Photography", author: "Sita Maharjan", target: "Puja Gurung", rating: 5, text: "Beautiful album. On time for the janti.", city: "Pokhara", status: "active", time: "3 days ago" },
  { id: "rv8", listing: "Kirana Store — Sah", author: "Ramesh Tamang", target: "Prakash Shrestha", rating: 1, text: "Overcharged and rude. Fake 5-star reviews?", city: "Lahan", status: "flagged", time: "4 days ago" },
  { id: "rv9", listing: "Yoga at Home", author: "Binita Adhikari", target: "Laxmi Dhakal", rating: 5, text: "Calm sessions, very professional.", city: "Kathmandu", status: "active", time: "5 days ago" },
  { id: "rv10", listing: "MacBook Air M2", author: "Prakash Shrestha", target: "Prakash Shrestha", rating: 4, text: "Light scratches not in photos but works well.", city: "Lalitpur", status: "active", time: "6 days ago" },
  { id: "rv11", listing: "School Teacher", author: "Gopal Yadav", target: "Sunrise Academy", rating: 2, text: "Job post said full time, they wanted unpaid trial week.", city: "Lahan", status: "hidden", time: "1 week ago" },
  { id: "rv12", listing: "Laptop Repair", author: "Hari Prasad", target: "Rekha KC", rating: 5, text: "Fixed overheating same day.", city: "Itahari", status: "active", time: "1 week ago" },
];

export const NOTICES: Notice[] = [
  { id: "n1", title: "KYC queue backlog", body: "12 provider applications waiting more than 24h. Assign night shift.", audience: "Staff · KYC", channel: "in-app", status: "sent", time: "8 mins ago", reads: 4 },
  { id: "n2", title: "Dashain promo live", body: "Featured listing 20% off until 20 Sep. Caps at 200 slots.", audience: "All sellers", channel: "push", status: "sent", time: "1 hour ago", reads: 1840 },
  { id: "n3", title: "Verify your nagrita", body: "Unverified providers cannot post new services.", audience: "Pending providers", channel: "email", status: "sent", time: "3 hours ago", reads: 96 },
  { id: "n4", title: "Payout window Friday", body: "eSewa / Khalti payouts run 10:00–16:00 NPT.", audience: "Verified providers", channel: "in-app", status: "scheduled", time: "Fri 10:00", reads: 0 },
  { id: "n5", title: "New job guidelines", body: "Salary must be in NPR. Ghost jobs will be removed.", audience: "Employers", channel: "email", status: "draft", time: "Not sent", reads: 0 },
  { id: "n6", title: "Safety tip: meet in public", body: "For used items & vehicles, use busy bazaar spots.", audience: "All buyers", channel: "push", status: "sent", time: "Yesterday", reads: 12040 },
  { id: "n7", title: "Blocked account appeal", body: "Nabin Thapa submitted an appeal. Review in Reports.", audience: "Staff · Moderation", channel: "in-app", status: "sent", time: "Yesterday", reads: 3 },
  { id: "n8", title: "High severity reports", body: "3 vehicle/property reports need Super Admin.", audience: "Staff · Super", channel: "in-app", status: "sent", time: "2 days ago", reads: 2 },
  { id: "n9", title: "App v1.4 live", body: "Buyer listings now show 2-per-row cards.", audience: "All users", channel: "push", status: "sent", time: "3 days ago", reads: 40210 },
  { id: "n10", title: "Staff password rotation", body: "Rotate passwords by 25 Aug. SSO coming Q4.", audience: "All staff", channel: "email", status: "scheduled", time: "25 Aug 09:00", reads: 0 },
  { id: "n11", title: "Lahan featured sellers", body: "Regional campaign draft for Siraha corridor.", audience: "Ads team", channel: "in-app", status: "draft", time: "Not sent", reads: 0 },
  { id: "n12", title: "Failed Khalti webhook", body: "TXN-88170 needs manual reconcile.", audience: "Staff · Finance", channel: "in-app", status: "sent", time: "4 days ago", reads: 5 },
];

export const ADS: Ad[] = [
  { id: "ad1", name: "Dashain Homes — Valley", advertiser: "Sita Maharjan", placement: "Home · Featured", budget: 45000, spent: 18200, status: "live", ctr: "3.4%", dates: "10 Aug – 20 Sep" },
  { id: "ad2", name: "TechCorp Hiring Blitz", advertiser: "TechCorp Pvt. Ltd.", placement: "Jobs feed", budget: 25000, spent: 12100, status: "live", ctr: "2.1%", dates: "01 Aug – 31 Aug" },
  { id: "ad3", name: "iPhone Baneshwor", advertiser: "Suresh Adhikari", placement: "Electronics grid", budget: 8000, spent: 8000, status: "ended", ctr: "1.6%", dates: "01 Jul – 31 Jul" },
  { id: "ad4", name: "Lakeside Villa", advertiser: "Bikash Karki", placement: "Property detail", budget: 30000, spent: 4200, status: "paused", ctr: "4.0%", dates: "12 Aug – 12 Sep" },
  { id: "ad5", name: "NAJIK Services — East", advertiser: "NAJIK Ads", placement: "Explore banner", budget: 60000, spent: 21400, status: "live", ctr: "2.8%", dates: "01 Aug – 30 Sep" },
  { id: "ad6", name: "Kirana Store Lahan", advertiser: "Prakash Shrestha", placement: "Nearby listings", budget: 5000, spent: 900, status: "pending", ctr: "—", dates: "Awaiting KYC" },
  { id: "ad7", name: "Creta 2022 push", advertiser: "Dipesh Rai", placement: "Vehicles", budget: 12000, spent: 3100, status: "live", ctr: "1.9%", dates: "08 Aug – 08 Sep" },
  { id: "ad8", name: "Yoga pack Kathmandu", advertiser: "Laxmi Dhakal", placement: "Services", budget: 7000, spent: 7000, status: "ended", ctr: "3.1%", dates: "01 Jul – 31 Jul" },
  { id: "ad9", name: "School Teacher — Lahan", advertiser: "Sunrise Academy", placement: "Jobs sidebar", budget: 4000, spent: 0, status: "pending", ctr: "—", dates: "Needs approval" },
  { id: "ad10", name: "Monsoon electronics", advertiser: "Rekha KC", placement: "Home carousel", budget: 15000, spent: 6400, status: "paused", ctr: "1.2%", dates: "15 Jul – 15 Aug" },
];

export const INBOX = [
  { id: "m1", from: "Sabina Magar", preview: "I uploaded a clearer nagrita. Please recheck KYC.", time: "4 mins ago", unread: true },
  { id: "m2", from: "Bikash Karki", preview: "Payout for booking bk3 still not in eSewa.", time: "22 mins ago", unread: true },
  { id: "m3", from: "Sita Maharjan", preview: "Can we feature the Patan heritage home this week?", time: "1 hour ago", unread: true },
  { id: "m4", from: "Hari Prasad", preview: "The fake listing in Chitwan is still online.", time: "3 hours ago", unread: true },
  { id: "m5", from: "TechCorp HR", preview: "Please approve the React role — we are hiring this week.", time: "Yesterday", unread: true },
  { id: "m6", from: "Finance bot", preview: "Khalti webhook failed for TXN-88170.", time: "Yesterday", unread: false },
  { id: "m7", from: "Maya Limbu", preview: "Thanks for hiding the abusive chat. All good now.", time: "2 days ago", unread: false },
  { id: "m8", from: "Dipesh Rai", preview: "Creta papers scanned and attached.", time: "2 days ago", unread: false },
];

export const ALERTS = [
  { id: "a1", title: "12 KYC items older than 24h", level: "warn" as const, href: "/admin/kyc" },
  { id: "a2", title: "High severity: stolen bike suspected", level: "danger" as const, href: "/admin/reports" },
  { id: "a3", title: "Failed payment TXN-88170", level: "danger" as const, href: "/admin/payments" },
  { id: "a4", title: "3 properties waiting for approval", level: "info" as const, href: "/admin/properties?status=pending" },
  { id: "a5", title: "Dashain Homes campaign at 40% budget", level: "info" as const, href: "/admin/ads" },
  { id: "a6", title: "Nabin Thapa appeal received", level: "warn" as const, href: "/admin/users?status=blocked" },
  { id: "a7", title: "Provider queue: 2 new applications", level: "info" as const, href: "/admin/providers" },
  { id: "a8", title: "Flagged review on Kirana Store", level: "warn" as const, href: "/admin/reviews?status=flagged" },
  { id: "a9", title: "Night moderator account disabled", level: "info" as const, href: "/admin/staff" },
  { id: "a10", title: "Payout window Friday 10:00 NPT", level: "info" as const, href: "/admin/payments" },
  { id: "a11", title: "iPhone 14 Pro Max pending 30m", level: "info" as const, href: "/admin/electronics?status=pending" },
  { id: "a12", title: "System: all clusters operational", level: "ok" as const, href: "/admin/settings" },
];

export const PLATFORM_KPIS = {
  totalUsers: 128540,
  activeUsers: 98430,
  verifiedUsers: 76205,
  blockedUsers: 3250,
  pendingUsers: 5320,
  propertyUsers: 24650,
  jobUsers: 18320,
  serviceUsers: 15480,
  providers: 6235,
  electronicUsers: 11240,
  usedItemUsers: 9870,
  shopUsers: 8650,
  properties: 15320,
  listings: 45230,
  jobs: 9060,
  vehicles: 6240,
  usedItems: 4065,
  shops: 3600,
  electronics: 5880,
  revenue: 12450000,
  revenueDelta: 16.4,
};

export const GROWTH = {
  Users: [
    { m: "Jan", v: 18540 },
    { m: "Feb", v: 19820 },
    { m: "Mar", v: 21450 },
    { m: "Apr", v: 24110 },
    { m: "May", v: 26240 },
    { m: "Jun", v: 28540 },
  ],
  Properties: [
    { m: "Jan", v: 2100 },
    { m: "Feb", v: 2280 },
    { m: "Mar", v: 2510 },
    { m: "Apr", v: 2740 },
    { m: "May", v: 3010 },
    { m: "Jun", v: 3320 },
  ],
  Jobs: [
    { m: "Jan", v: 980 },
    { m: "Feb", v: 1120 },
    { m: "Mar", v: 1260 },
    { m: "Apr", v: 1410 },
    { m: "May", v: 1590 },
    { m: "Jun", v: 1780 },
  ],
  Services: [
    { m: "Jan", v: 740 },
    { m: "Feb", v: 810 },
    { m: "Mar", v: 920 },
    { m: "Apr", v: 1010 },
    { m: "May", v: 1180 },
    { m: "Jun", v: 1340 },
  ],
  Electronics: [
    { m: "Jan", v: 620 },
    { m: "Feb", v: 680 },
    { m: "Mar", v: 770 },
    { m: "Apr", v: 840 },
    { m: "May", v: 930 },
    { m: "Jun", v: 1050 },
  ],
};

export const REVENUE_BARS = Array.from({ length: 30 }, (_, i) => ({
  d: `${i + 1}`,
  v: 280000 + ((i * 37) % 9) * 42000 + (i % 5) * 18000,
}));

export const CATEGORY_SHARE = [
  { name: "Property", value: 32, count: 14490, color: "#1b7d2c" },
  { name: "Jobs", value: 20, count: 9060, color: "#3d6b5a" },
  { name: "Services", value: 18, count: 8135, color: "#5a6b52" },
  { name: "Electronics", value: 13, count: 5880, color: "#7a5c3a" },
  { name: "Used Items", value: 9, count: 4065, color: "#4a6356" },
  { name: "Shops", value: 8, count: 3600, color: "#6b7054" },
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
};

export const ACTIVITY: Activity[] = [
  { id: "ac1", type: "New User", typeColor: "#1b7d2c", title: "Ramesh Tamang", by: "Self signup", category: "User", location: "Kathmandu", time: "2 mins ago", status: "Active" },
  { id: "ac2", type: "New Property", typeColor: "#3d6b5a", title: "Modern 3 BHK House", by: "Sita Maharjan", category: "Property", location: "Lalitpur", time: "10 mins ago", status: "Pending" },
  { id: "ac3", type: "New Job", typeColor: "#5a6b52", title: "Senior React Developer", by: "TechCorp Pvt. Ltd.", category: "Jobs", location: "Kathmandu", time: "15 mins ago", status: "Approved" },
  { id: "ac4", type: "Electronics", typeColor: "#7a5c3a", title: "iPhone 14 Pro Max", by: "Suresh Adhikari", category: "Electronics", location: "Biratnagar", time: "30 mins ago", status: "Pending" },
  { id: "ac5", type: "Report", typeColor: "#c62828", title: "Fake Listing Report", by: "Hari Prasad", category: "Report", location: "Nepalgunj", time: "1 hour ago", status: "Under Review" },
  { id: "ac6", type: "Service", typeColor: "#167a38", title: "Plumbing — same day", by: "Bikash Karki", category: "Services", location: "Pokhara", time: "1 hour ago", status: "Verified" },
  { id: "ac7", type: "Booking", typeColor: "#4a6356", title: "Home Cleaning (3BHK)", by: "Laxmi Dhakal", category: "Booking", location: "Kathmandu", time: "2 hours ago", status: "Active" },
  { id: "ac8", type: "Payment", typeColor: "#3d6b5a", title: "TXN-88418 · NPR 2,400", by: "Laxmi Dhakal", category: "Khalti", location: "Kathmandu", time: "2 hours ago", status: "Completed" },
  { id: "ac9", type: "KYC", typeColor: "#1b7d2c", title: "Sabina Magar nagrita", by: "Sabina Magar", category: "Provider", location: "Dharan", time: "Yesterday", status: "Pending" },
  { id: "ac10", type: "Vehicle", typeColor: "#6b7054", title: "Hyundai Creta 2022", by: "Dipesh Rai", category: "Vehicles", location: "Lahan", time: "Yesterday", status: "Approved" },
  { id: "ac11", type: "Review", typeColor: "#b45309", title: "5★ Plumbing visit", by: "Ramesh Tamang", category: "Reviews", location: "Kathmandu", time: "Yesterday", status: "Active" },
  { id: "ac12", type: "Ad", typeColor: "#5a6b52", title: "Dashain Homes — Valley", by: "Sita Maharjan", category: "Promo", location: "Kathmandu", time: "2 days ago", status: "Live" },
];
