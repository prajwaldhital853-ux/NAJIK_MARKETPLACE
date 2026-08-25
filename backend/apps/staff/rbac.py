"""Page-based RBAC helpers for staff admin APIs."""
from rest_framework.exceptions import PermissionDenied

LISTING_CATEGORY_PAGE = {
    "property": "property_management",
    "jobs": "job_management",
    "services": "service_management",
    "nearby": "electronics_management",
    "vehicles": "other_listings",
    "marketplace": "other_listings",
    "business": "other_listings",
}

LISTING_PAGES = tuple(dict.fromkeys(LISTING_CATEGORY_PAGE.values()))

METHOD_ACTION = {
    "GET": "view",
    "HEAD": "view",
    "OPTIONS": "view",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}


def listing_page(category: str) -> str:
    return LISTING_CATEGORY_PAGE.get(category, "other_listings")


def action_for_method(method: str) -> str:
    return METHOD_ACTION.get(method.upper(), "view")


def user_has_rbac(user, page: str, action: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_super_admin", False):
        return True
    return user.has_permission(f"{page}.{action}")


def require_rbac(user, page: str, action: str):
    if not user_has_rbac(user, page, action):
        raise PermissionDenied(
            f"You don't have permission to perform this action. Required: {page}.{action}"
        )


def require_rbac_method(user, page: str, method: str):
    require_rbac(user, page, action_for_method(method))


def require_listing_rbac(user, listing_or_category, method: str):
    category = listing_or_category if isinstance(listing_or_category, str) else listing_or_category.category
    require_rbac_method(user, listing_page(category), method)


def require_any_listing_view(user):
    if getattr(user, "is_super_admin", False):
        return
    if any(user_has_rbac(user, page, "view") for page in LISTING_PAGES):
        return
    raise PermissionDenied("You don't have permission to view listings.")


def require_listing_list_view(user, category_param: str | None):
    if not category_param:
        require_any_listing_view(user)
        return
    categories = [item.strip() for item in category_param.split(",") if item.strip()]
    if not categories:
        require_any_listing_view(user)
        return
    for category in categories:
        require_rbac(user, listing_page(category), "view")
