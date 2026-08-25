"""
Staff CRUD APIs with proper RBAC checks.
Only super admins can manage staff accounts.
"""
from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser, require_super_admin
from apps.staff.models import StaffUser, Role
from apps.staff.serializers.auth import StaffPublicSerializer, RoleSerializer


class StaffCreateSerializer(serializers.ModelSerializer):
    """Create staff with email and temporary password."""
    password = serializers.CharField(write_only=True, min_length=8)
    role_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = StaffUser
        fields = ("email", "full_name", "password", "role_id", "is_super_admin")

    def validate_password(self, value):
        if not StaffUser.validate_password_strength(value):
            raise serializers.ValidationError(
                "Password must contain at least 8 characters, "
                "1 uppercase, 1 lowercase, 1 number, and 1 special character"
            )
        return value

    def validate_role_id(self, value):
        if value:
            if not Role.objects.filter(id=value, is_active=True).exists():
                raise serializers.ValidationError("Invalid role")
        return value

    def create(self, validated_data):
        role_id = validated_data.pop('role_id', None)
        password = validated_data.pop('password')
        
        staff = StaffUser.objects.create(**validated_data)
        staff.set_password(password)
        staff.must_change_password = True  # Force password change on first login
        
        if role_id:
            staff.role_id = role_id
        
        staff.created_by = self.context['request'].user
        staff.save()
        
        return staff


class StaffUpdateSerializer(serializers.ModelSerializer):
    """Update staff details (excluding password)."""
    role_id = serializers.UUIDField(required=False, allow_null=True)
    email = serializers.EmailField(required=False)

    class Meta:
        model = StaffUser
        fields = ("email", "full_name", "role_id", "is_active", "is_super_admin")

    def validate_email(self, value):
        value = value.lower().strip()
        qs = StaffUser.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A staff account with this email already exists.")
        return value

    def validate_role_id(self, value):
        if value:
            if not Role.objects.filter(id=value, is_active=True).exists():
                raise serializers.ValidationError("Invalid role")
        return value

    def update(self, instance, validated_data):
        role_id = validated_data.pop('role_id', None)
        
        for key, value in validated_data.items():
            setattr(instance, key, value)
        
        if role_id:
            instance.role_id = role_id
        elif 'role_id' in self.initial_data and role_id is None:
            instance.role_id = None
        
        instance.save()
        return instance


class StaffListCreateView(APIView):
    """
    GET: List all staff members (super admin only)
    POST: Create new staff account (super admin only)
    """
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    @require_super_admin
    def get(self, request):
        """List all staff with their roles and permissions."""
        staff_list = StaffUser.objects.select_related('role').filter(
            is_active=True
        ).order_by('-date_joined')
        
        return Response({
            "staff": StaffPublicSerializer(staff_list, many=True).data
        })

    @require_super_admin
    def post(self, request):
        """Create a new staff account."""
        serializer = StaffCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        staff = serializer.save()
        
        # Publish real-time event
        from apps.core.realtime import publish_event
        publish_event("staff_changed")
        
        # TODO: Send welcome email with credentials
        
        return Response(
            StaffPublicSerializer(staff).data,
            status=status.HTTP_201_CREATED
        )


class StaffDetailView(APIView):
    """
    GET: Get staff details
    PATCH: Update staff
    DELETE: Delete/deactivate staff
    """
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    @require_super_admin
    def get(self, request, staff_id):
        try:
            staff = StaffUser.objects.select_related('role').get(id=staff_id)
        except StaffUser.DoesNotExist:
            return Response(
                {"detail": "Staff not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(StaffPublicSerializer(staff).data)

    @require_super_admin
    def patch(self, request, staff_id):
        """Update staff details."""
        try:
            staff = StaffUser.objects.get(id=staff_id)
        except StaffUser.DoesNotExist:
            return Response(
                {"detail": "Staff not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent self-demotion from super admin
        if staff.id == request.user.id and 'is_super_admin' in request.data:
            if not request.data['is_super_admin']:
                return Response(
                    {"detail": "Cannot remove your own super admin privileges"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = StaffUpdateSerializer(
            staff,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Publish real-time event
        from apps.core.realtime import publish_event
        publish_event("staff_changed")
        
        return Response(StaffPublicSerializer(staff).data)

    @require_super_admin
    def delete(self, request, staff_id):
        """Deactivate staff account (soft delete)."""
        try:
            staff = StaffUser.objects.get(id=staff_id)
        except StaffUser.DoesNotExist:
            return Response(
                {"detail": "Staff not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent self-deletion
        if staff.id == request.user.id:
            return Response(
                {"detail": "Cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        staff.is_active = False
        staff.save(update_fields=["is_active"])
        
        # Publish real-time event
        from apps.core.realtime import publish_event
        publish_event("staff_changed")
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffResetPasswordView(APIView):
    """Reset staff password (super admin only)."""
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]

    @require_super_admin
    def post(self, request, staff_id):
        """Generate and set temporary password for staff."""
        try:
            staff = StaffUser.objects.get(id=staff_id)
        except StaffUser.DoesNotExist:
            return Response(
                {"detail": "Staff not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        new_password = request.data.get('new_password')
        if not new_password:
            return Response(
                {"detail": "new_password is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            staff.set_password(new_password)
            staff.must_change_password = True
            staff.save()
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            "message": "Password reset successfully. User must change password on next login."
        })

