export type AccountType = "user" | "provider";
export type VerificationStatus = "none" | "pending" | "verified" | "rejected";
export type ProviderServiceType = "Real Estate" | "Job Poster" | "Vehicles" | "Local Services" | "Used Items" | "Other";

export type AppUser = {
  id?: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  account_type: AccountType;
  verification_status?: VerificationStatus;
  application_id?: string;
  address?: string;
  contact?: string;
  service_type?: ProviderServiceType | string;
  nagrita_uri?: string;
  photo_uri?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  has_pending_edit?: boolean;
  date_joined?: string;
};

export type DealType = "For Sale" | "For Rent";
export type ListingStatus = "Active" | "Pending" | "Sold" | "Expired" | "LIVE";

export type Listing = {
  id: string;
  title: string;
  price: string;
  location: string;
  time: string;
  image: string;
  category: "Property" | "Vehicle" | "Job" | "Service";
  badge?: "FEATURED" | "VERIFIED" | "LIVE";
  savedOn?: string;
  meta?: string;
  extra?: string[];
  rating?: string;
  views?: number;
  inquiries?: number;
  beds?: number;
  baths?: number;
  sqft?: string;
  dealType?: DealType;
  status?: ListingStatus;
  postedOn?: string;
};

export type Inquiry = {
  id: string;
  name: string;
  avatar: string;
  status: "New" | "In Progress" | "Responded" | "Closed";
  time: string;
  message: string;
  phone: string;
  email?: string;
  listingTitle: string;
  listingPrice: string;
  listingImage: string;
  action: string;
};
