"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "./session";
import { can, canForPath, canListing, pageFromPath } from "./rbac";

export function usePageRbac(pageOverride?: string, listingCategory?: string) {
  const { staff } = useSession();
  const pathname = usePathname();
  const page = pageOverride || pageFromPath(pathname) || "";

  return useMemo(() => {
    const canView = listingCategory
      ? canListing(staff, listingCategory, "view")
      : page
        ? can(staff, page, "view")
        : canForPath(staff, pathname, "view");
    const canCreate = listingCategory
      ? canListing(staff, listingCategory, "create")
      : page
        ? can(staff, page, "create")
        : canForPath(staff, pathname, "create");
    const canUpdate = listingCategory
      ? canListing(staff, listingCategory, "update")
      : page
        ? can(staff, page, "update")
        : canForPath(staff, pathname, "update");
    const canDelete = listingCategory
      ? canListing(staff, listingCategory, "delete")
      : page
        ? can(staff, page, "delete")
        : canForPath(staff, pathname, "delete");

    return {
      staff,
      page,
      canView,
      canCreate,
      canUpdate,
      canDelete,
      readOnly: canView && !canUpdate && !canDelete && !canCreate,
    };
  }, [staff, page, pathname, listingCategory]);
}
