import { redirect } from "next/navigation";

/** Buyers do not submit KYC — seller verification lives on /admin/providers. */
export default function KycPage() {
  redirect("/admin/providers");
}
