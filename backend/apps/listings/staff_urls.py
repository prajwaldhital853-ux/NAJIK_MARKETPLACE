from django.urls import path

from apps.listings.views import StaffListingDetailView, StaffListingListView, StaffListingPhotoView, StaffListingUrgentView, StaffUrgentListingListView

urlpatterns = [
    path("", StaffListingListView.as_view(), name="staff-listings"),
    path("urgent/", StaffUrgentListingListView.as_view(), name="staff-urgent-listings"),
    path("<uuid:pk>/", StaffListingDetailView.as_view(), name="staff-listing-detail"),
    path("<uuid:pk>/urgent/", StaffListingUrgentView.as_view(), name="staff-listing-urgent"),
    path("<uuid:pk>/photos/<uuid:photo_id>/", StaffListingPhotoView.as_view(), name="staff-listing-photo"),
]
