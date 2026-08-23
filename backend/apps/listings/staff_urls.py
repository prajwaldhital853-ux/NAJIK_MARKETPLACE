from django.urls import path

from apps.listings.views import (
    StaffListingDetailView,
    StaffListingListView,
    StaffListingPhotoView,
    StaffListingPromoteView,
    StaffListingUrgentView,
    StaffPromoteListingListView,
    StaffUrgentListingListView,
)
from apps.listings.views.bookings import StaffBookingListView
from apps.listings.views.staff_engagement import (
    StaffCommentModerationView,
    StaffEngagementListView,
    StaffEngagementSummaryView,
    StaffSellerReviewModerationView,
)

urlpatterns = [
    path("", StaffListingListView.as_view(), name="staff-listings"),
    path("urgent/", StaffUrgentListingListView.as_view(), name="staff-urgent-listings"),
    path("promote/", StaffPromoteListingListView.as_view(), name="staff-promote-listings"),
    path("engagement/", StaffEngagementListView.as_view(), name="staff-engagement-list"),
    path("engagement/summary/", StaffEngagementSummaryView.as_view(), name="staff-engagement-summary"),
    path("bookings/", StaffBookingListView.as_view(), name="staff-bookings"),
    path("comments/<uuid:pk>/", StaffCommentModerationView.as_view(), name="staff-comment-moderation"),
    path("seller-reviews/<uuid:pk>/", StaffSellerReviewModerationView.as_view(), name="staff-seller-review-moderation"),
    path("<uuid:pk>/", StaffListingDetailView.as_view(), name="staff-listing-detail"),
    path("<uuid:pk>/urgent/", StaffListingUrgentView.as_view(), name="staff-listing-urgent"),
    path("<uuid:pk>/promote/", StaffListingPromoteView.as_view(), name="staff-listing-promote"),
    path("<uuid:pk>/photos/<uuid:photo_id>/", StaffListingPhotoView.as_view(), name="staff-listing-photo"),
]
