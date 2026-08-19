"use client";

import { redirect } from "next/navigation";

export default function UsedItemsRedirect() {
  redirect("/admin/listings?kind=used");
}
