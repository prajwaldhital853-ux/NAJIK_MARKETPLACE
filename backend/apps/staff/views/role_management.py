"""
Role management views for super admins.
Supports custom role creation with granular permission assignment.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.staff.models import Role, Permission, RolePermission
from apps.staff.permissions import require_super_admin
from apps.staff.serializers.auth import RoleSerializer
from rest_framework import serializers


class PermissionSerializer(serializers.ModelSerializer):
    page_display = serializers.CharField(source='get_page_display', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = Permission
        fields = ('id', 'code', 'page', 'page_display', 'action', 'action_display', 'description')
        read_only_fields = fields


class RoleCreateUpdateSerializer(serializers.ModelSerializer):
    permission_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'is_active', 'permission_ids')
        read_only_fields = ('id',)
    
    def validate_name(self, value):
        # Check if name already exists (exclude current instance if updating)
        qs = Role.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A role with this name already exists.")
        return value
    
    def create(self, validated_data):
        permission_ids = validated_data.pop('permission_ids', [])
        role = Role.objects.create(**validated_data, created_by=self.context['request'].user)
        
        # Assign permissions
        if permission_ids:
            permissions = Permission.objects.filter(id__in=permission_ids)
            for perm in permissions:
                RolePermission.objects.create(
                    role=role,
                    permission=perm,
                    granted_by=self.context['request'].user
                )
        
        return role
    
    def update(self, instance, validated_data):
        permission_ids = validated_data.pop('permission_ids', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update permissions if provided
        if permission_ids is not None:
            # Clear existing permissions
            RolePermission.objects.filter(role=instance).delete()
            
            # Add new permissions
            permissions = Permission.objects.filter(id__in=permission_ids)
            for perm in permissions:
                RolePermission.objects.create(
                    role=instance,
                    permission=perm,
                    granted_by=self.context['request'].user
                )
        
        return instance


class RoleDetailSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    permission_ids = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'is_active', 'is_system_role', 
                 'permissions', 'permission_ids', 'staff_count', 'created_at')
    
    def get_permissions(self, obj):
        perms = [rp.permission for rp in obj.role_permissions.select_related("permission").all()]
        return PermissionSerializer(perms, many=True).data

    def get_permission_ids(self, obj):
        return [str(rp.permission_id) for rp in obj.role_permissions.all()]
    
    def get_staff_count(self, obj):
        return obj.staff_users.filter(is_active=True).count()


class PermissionListView(APIView):
    """List all available permissions grouped by page."""
    
    @require_super_admin
    def get(self, request):
        permissions = Permission.objects.all().order_by('page', 'action')
        
        # Group by page
        grouped = {}
        for perm in permissions:
            page = perm.page
            if page not in grouped:
                grouped[page] = {
                    'page': page,
                    'page_display': perm.get_page_display(),
                    'permissions': []
                }
            grouped[page]['permissions'].append(PermissionSerializer(perm).data)
        
        return Response({
            'pages': list(grouped.values()),
            'all_permissions': PermissionSerializer(permissions, many=True).data
        })


class RoleListCreateView(APIView):
    """List all roles or create a new custom role."""
    
    @require_super_admin
    def get(self, request):
        from apps.staff.rbac_seed import ensure_page_rbac
        ensure_page_rbac()
        roles = Role.objects.filter(is_active=True).prefetch_related('role_permissions__permission')
        serializer = RoleDetailSerializer(roles, many=True)
        return Response(serializer.data)
    
    @require_super_admin
    def post(self, request):
        serializer = RoleCreateUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(
            RoleDetailSerializer(role).data,
            status=status.HTTP_201_CREATED
        )


class RoleDetailView(APIView):
    """Get, update, or delete a specific role."""
    
    @require_super_admin
    def get(self, request, role_id):
        try:
            role = Role.objects.prefetch_related('role_permissions__permission').get(id=role_id)
            return Response(RoleDetailSerializer(role).data)
        except Role.DoesNotExist:
            return Response(
                {"detail": "Role not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @require_super_admin
    def patch(self, request, role_id):
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response(
                {"detail": "Role not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = RoleCreateUpdateSerializer(
            role, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        
        from apps.core.realtime import publish_event
        publish_event("staff_changed")
        
        return Response(RoleDetailSerializer(role).data)
    
    @require_super_admin
    def delete(self, request, role_id):
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response(
                {"detail": "Role not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent deletion of system roles
        if role.is_system_role:
            return Response(
                {"detail": "Cannot delete system roles"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if role is assigned to any staff
        staff_count = role.staff_users.filter(is_active=True).count()
        if staff_count > 0:
            return Response(
                {"detail": f"Cannot delete role assigned to {staff_count} staff member(s)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        role.is_active = False
        role.save()
        
        # Publish real-time event
        from apps.core.realtime import publish_event
        publish_event("staff_changed")
        
        return Response(status=status.HTTP_204_NO_CONTENT)
