from django.urls import path

from apps.listings.views import (
    ListingCommentView,
    ListingFeedView,
    ListingMineDetailView,
    ListingMineView,
    ListingPhotoFileView,
    ListingPublicDetailView,
    ListingReviewView,
    ListingSaveView,
    ListingSoldView,
    PublicSellerPhotoView,
    PublicSellerProfileView,
)
from apps.listings.views.bookings import BookingActionView, BookingListCreateView

urlpatterns = [
    path("feed/", ListingFeedView.as_view(), name="listing-feed"),
    path("bookings/", BookingListCreateView.as_view(), name="listing-bookings"),
    path("bookings/<uuid:pk>/action/", BookingActionView.as_view(), name="listing-booking-action"),
    path("sellers/<uuid:pk>/photo/", PublicSellerPhotoView.as_view(), name="listing-seller-photo"),
    path("sellers/<uuid:pk>/", PublicSellerProfileView.as_view(), name="listing-seller-profile"),
    path("me/", ListingMineView.as_view(), name="listing-mine"),
    path("me/<uuid:pk>/sold/", ListingSoldView.as_view(), name="listing-sold"),
    path("me/<uuid:pk>/", ListingMineDetailView.as_view(), name="listing-mine-detail"),
    path("<uuid:pk>/comments/", ListingCommentView.as_view(), name="listing-comments"),
    path("<uuid:pk>/reviews/", ListingReviewView.as_view(), name="listing-reviews"),
    path("<uuid:pk>/save/", ListingSaveView.as_view(), name="listing-save"),
    path("<uuid:pk>/", ListingPublicDetailView.as_view(), name="listing-detail"),
    path("<uuid:pk>/photos/<uuid:photo_id>/", ListingPhotoFileView.as_view(), name="listing-photo"),
]
