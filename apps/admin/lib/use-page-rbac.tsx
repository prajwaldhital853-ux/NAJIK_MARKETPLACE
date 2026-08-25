"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { formatRbacDeniedMessage } from "./rbac-errors";
import type { RbacAction } from "./rbac";
import { can, canForPath, canListing, LISTING_CATEGORY_PAGE, pageFromPath } from "./rbac";
import { useSession } from "./session";
import { useAdmin } from "./store";

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

function resolvePageCode(pageOverride?: string, listingCategory?: string, pathnamePage?: string) {
  if (pageOverride) return pageOverride;
  if (listingCategory) return LISTING_CATEGORY_PAGE[listingCategory] || "other_listings";
  return pathnamePage || "";
}

/** Permission guards with user-facing toast messages for read-only staff. */
export function useRbacGuard(pageOverride?: string, listingCategory?: string) {
  const { toast } = useAdmin();
  const rbac = usePageRbac(pageOverride, listingCategory);
  const pageCode = resolvePageCode(pageOverride, listingCategory, rbac.page);

  function deny(action: RbacAction): false {
    toast(formatRbacDeniedMessage(action, pageCode));
    return false;
  }

  return {
    ...rbac,
    pageCode,
    guardView: () => rbac.canView || deny("view"),
    guardCreate: () => rbac.canCreate || deny("create"),
    guardUpdate: () => rbac.canUpdate || deny("update"),
    guardDelete: () => rbac.canDelete || deny("delete"),
  };
}

export function ReadOnlyBanner({ label }: { label?: string }) {
  return (
    <p className="rounded-xl border border-line bg-elevated px-3 py-2 text-xs text-muted">
      View-only access{label ? ` on ${label}` : ""} — create, edit, and delete actions are disabled. Ask your Super
      Admin to grant the permissions you need.
    </p>
  );
}
