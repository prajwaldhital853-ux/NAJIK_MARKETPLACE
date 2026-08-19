from django.urls import path

from apps.listings.views import StaffListingDetailView, StaffListingListView, StaffListingPhotoView

urlpatterns = [
    path("", StaffListingListView.as_view(), name="staff-listings"),
    path("<uuid:pk>/", StaffListingDetailView.as_view(), name="staff-listing-detail"),
    path("<uuid:pk>/photos/<uuid:photo_id>/", StaffListingPhotoView.as_view(), name="staff-listing-photo"),
]
