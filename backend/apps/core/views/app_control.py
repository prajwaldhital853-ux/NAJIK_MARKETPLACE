import mimetypes

from django.db.models import Q
from django.http import FileResponse, HttpResponse
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import HomeBannerSlide, ProviderLedgerEntry, ProviderPlan
from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser
from apps.staff.rbac import require_rbac_method
from apps.verification.serializers import file_from_data_uri

MAX_HOME_BANNERS = 3


def slide_image_url(request, slide: HomeBannerSlide) -> str:
    stamp = int(slide.updated_at.timestamp()) if slide.updated_at else 0
    return request.build_absolute_uri(f"/api/app-control/home-banners/{slide.id}/image/?v={stamp}")


def slide_payload(request, slide: HomeBannerSlide) -> dict:
    return {
        "id": str(slide.id),
        "image_url": slide_image_url(request, slide),
        "audience": slide.audience,
        "audience_label": slide.get_audience_display(),
        "sort_order": slide.sort_order,
        "is_active": slide.is_active,
        "created_at": slide.created_at,
        "updated_at": slide.updated_at,
    }


def audience_filter(audience: str) -> Q:
    if audience == "buyer":
        return Q(audience__in=[HomeBannerSlide.AUDIENCE_ALL, HomeBannerSlide.AUDIENCE_BUYER])
    if audience == "provider":
        return Q(audience__in=[HomeBannerSlide.AUDIENCE_ALL, HomeBannerSlide.AUDIENCE_PROVIDER])
    return Q(audience=HomeBannerSlide.AUDIENCE_ALL)


class PublicHomeBannersView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        audience = (request.query_params.get("audience") or "buyer").strip().lower()
        if audience not in {"buyer", "provider"}:
            audience = "buyer"
        slides = HomeBannerSlide.objects.filter(is_active=True).filter(audience_filter(audience))
        return Response([slide_payload(request, slide) for slide in slides])


class PublicHomeBannerImageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, pk):
        slide = HomeBannerSlide.objects.filter(pk=pk, is_active=True).first()
        if not slide or not slide.image:
            return HttpResponse(status=404)
        content_type, _ = mimetypes.guess_type(slide.image.name)
        response = FileResponse(
            slide.image.open("rb"),
            content_type=content_type or "image/jpeg",
        )
        response["Cache-Control"] = "no-store, max-age=0"
        return response


class StaffHomeBannerListCreateView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        slides = HomeBannerSlide.objects.all()
        return Response([slide_payload(request, slide) for slide in slides])

    def post(self, request):
        require_rbac_method(request.user, "app_control", "POST")
        active_count = HomeBannerSlide.objects.filter(is_active=True).count()
        if active_count >= MAX_HOME_BANNERS:
            return Response(
                {"detail": f"You can show up to {MAX_HOME_BANNERS} banners. Delete or deactivate one first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        uri = request.data.get("image_uri") or request.data.get("banner_uri")
        if not uri:
            return Response({"detail": "Provide image_uri with a JPEG, PNG, or WebP image."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            content = file_from_data_uri(uri, "home_banner")
        except serializers.ValidationError as exc:
            detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
        audience = str(request.data.get("audience") or HomeBannerSlide.AUDIENCE_ALL)
        if audience not in dict(HomeBannerSlide.AUDIENCE_CHOICES):
            audience = HomeBannerSlide.AUDIENCE_ALL
        sort_order = request.data.get("sort_order")
        try:
            sort_order = int(sort_order) if sort_order is not None else active_count
        except (TypeError, ValueError):
            sort_order = active_count
        slide = HomeBannerSlide.objects.create(
            audience=audience,
            sort_order=max(0, min(sort_order, MAX_HOME_BANNERS - 1)),
            is_active=True,
        )
        slide.image.save(content.name, content, save=True)
        return Response(slide_payload(request, slide), status=status.HTTP_201_CREATED)


class StaffHomeBannerDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        require_rbac_method(request.user, "app_control", "PATCH")
        slide = HomeBannerSlide.objects.filter(pk=pk).first()
        if not slide:
            return Response({"detail": "Banner not found."}, status=status.HTTP_404_NOT_FOUND)
        if "audience" in request.data:
            audience = str(request.data.get("audience") or slide.audience)
            if audience in dict(HomeBannerSlide.AUDIENCE_CHOICES):
                slide.audience = audience
        if "sort_order" in request.data:
            try:
                slide.sort_order = max(0, int(request.data.get("sort_order")))
            except (TypeError, ValueError):
                pass
        if "is_active" in request.data:
            next_active = bool(request.data.get("is_active"))
            if next_active and not slide.is_active:
                active_count = HomeBannerSlide.objects.filter(is_active=True).count()
                if active_count >= MAX_HOME_BANNERS:
                    return Response(
                        {"detail": f"Only {MAX_HOME_BANNERS} active banners allowed."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            slide.is_active = next_active
        uri = request.data.get("image_uri") or request.data.get("banner_uri")
        if uri:
            try:
                content = file_from_data_uri(uri, "home_banner")
            except serializers.ValidationError as exc:
                detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
                return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)
            if slide.image:
                slide.image.delete(save=False)
            slide.image.save(content.name, content, save=False)
        slide.save()
        return Response(slide_payload(request, slide))

    def delete(self, request, pk):
        require_rbac_method(request.user, "app_control", "DELETE")
        slide = HomeBannerSlide.objects.filter(pk=pk).first()
        if not slide:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if slide.image:
            slide.image.delete(save=False)
        slide.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def plan_payload(plan: ProviderPlan) -> dict:
    return {
        "id": str(plan.id),
        "name": plan.name,
        "price_label": plan.price_label,
        "description": plan.description,
        "sort_order": plan.sort_order,
        "is_active": plan.is_active,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at,
    }


class PublicProviderPlansView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        plans = ProviderPlan.objects.filter(is_active=True)
        return Response([plan_payload(plan) for plan in plans])


class StaffProviderPlanListCreateView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        plans = ProviderPlan.objects.all()
        return Response([plan_payload(plan) for plan in plans])

    def post(self, request):
        require_rbac_method(request.user, "app_control", "POST")
        name = (request.data.get("name") or "").strip()
        price_label = (request.data.get("price_label") or "").strip()
        if not name or not price_label:
            return Response({"detail": "name and price_label are required."}, status=status.HTTP_400_BAD_REQUEST)
        description = (request.data.get("description") or "").strip()
        sort_order = request.data.get("sort_order")
        try:
            sort_order = int(sort_order) if sort_order is not None else 0
        except (TypeError, ValueError):
            sort_order = 0
        plan = ProviderPlan.objects.create(
            name=name,
            price_label=price_label,
            description=description,
            sort_order=max(0, sort_order),
            is_active=bool(request.data.get("is_active", True)),
        )
        return Response(plan_payload(plan), status=status.HTTP_201_CREATED)


class StaffProviderPlanDetailView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        require_rbac_method(request.user, "app_control", "PATCH")
        plan = ProviderPlan.objects.filter(pk=pk).first()
        if not plan:
            return Response({"detail": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)
        if "name" in request.data:
            plan.name = (request.data.get("name") or plan.name).strip()
        if "price_label" in request.data:
            plan.price_label = (request.data.get("price_label") or plan.price_label).strip()
        if "description" in request.data:
            plan.description = (request.data.get("description") or "").strip()
        if "sort_order" in request.data:
            try:
                plan.sort_order = max(0, int(request.data.get("sort_order")))
            except (TypeError, ValueError):
                pass
        if "is_active" in request.data:
            plan.is_active = bool(request.data.get("is_active"))
        plan.save()
        return Response(plan_payload(plan))

    def delete(self, request, pk):
        require_rbac_method(request.user, "app_control", "DELETE")
        plan = ProviderPlan.objects.filter(pk=pk).first()
        if not plan:
            return Response(status=status.HTTP_404_NOT_FOUND)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def ledger_payload(entry: ProviderLedgerEntry) -> dict:
    return {
        "id": str(entry.id),
        "provider_id": str(entry.provider_id),
        "provider_name": entry.provider.full_name or "",
        "kind": entry.kind,
        "title": entry.title,
        "amount_label": entry.amount_label,
        "note": entry.note,
        "created_at": entry.created_at,
        "created_by": str(entry.created_by_id) if entry.created_by_id else None,
    }


class StaffProviderLedgerListCreateView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request):
        items = ProviderLedgerEntry.objects.select_related("provider", "created_by").all()
        provider = (request.query_params.get("provider") or "").strip()
        if provider:
            items = items.filter(provider_id=provider)
        kind = (request.query_params.get("kind") or "").strip()
        if kind:
            items = items.filter(kind=kind)
        return Response([ledger_payload(row) for row in items[:200]])

    def post(self, request):
        require_rbac_method(request.user, "app_control", "POST")
        provider_id = (request.data.get("provider_id") or "").strip()
        title = (request.data.get("title") or "").strip()
        if not provider_id or not title:
            return Response({"detail": "provider_id and title are required."}, status=status.HTTP_400_BAD_REQUEST)
        from apps.accounts.models import AppUser

        provider = AppUser.objects.filter(pk=provider_id, account_type=AppUser.ACCOUNT_PROVIDER).first()
        if not provider:
            return Response({"detail": "Service provider not found."}, status=status.HTTP_400_BAD_REQUEST)
        kind = (request.data.get("kind") or ProviderLedgerEntry.KIND_OTHER).strip()
        if kind not in dict(ProviderLedgerEntry.KIND_CHOICES):
            kind = ProviderLedgerEntry.KIND_OTHER
        entry = ProviderLedgerEntry.objects.create(
            provider=provider,
            kind=kind,
            title=title,
            amount_label=(request.data.get("amount_label") or "").strip()[:40],
            note=(request.data.get("note") or "").strip(),
            created_by=request.user if hasattr(request, "user") else None,
        )
        return Response(ledger_payload(entry), status=status.HTTP_201_CREATED)
