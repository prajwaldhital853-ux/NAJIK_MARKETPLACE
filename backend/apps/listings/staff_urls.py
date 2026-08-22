from django.urls import path

from apps.listings.views import StaffListingDetailView, StaffListingListView, StaffListingPhotoView, StaffListingPromoteView, StaffListingUrgentView, StaffPromoteListingListView, StaffUrgentListingListView

urlpatterns = [
    path("", StaffListingListView.as_view(), name="staff-listings"),
    path("urgent/", StaffUrgentListingListView.as_view(), name="staff-urgent-listings"),
    path("promote/", StaffPromoteListingListView.as_view(), name="staff-promote-listings"),
    path("<uuid:pk>/", StaffListingDetailView.as_view(), name="staff-listing-detail"),
    path("<uuid:pk>/urgent/", StaffListingUrgentView.as_view(), name="staff-listing-urgent"),
    path("<uuid:pk>/promote/", StaffListingPromoteView.as_view(), name="staff-listing-promote"),
    path("<uuid:pk>/photos/<uuid:photo_id>/", StaffListingPhotoView.as_view(), name="staff-listing-photo"),
]
