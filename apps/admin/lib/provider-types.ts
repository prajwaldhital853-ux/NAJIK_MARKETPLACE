export type ProviderApplication = {
  id: string;
  full_name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  service_type: string;
  nagrita_uri?: string;
  photo_uri?: string;
  status: "none" | "pending" | "verified" | "rejected";
  created_at: string;
};
