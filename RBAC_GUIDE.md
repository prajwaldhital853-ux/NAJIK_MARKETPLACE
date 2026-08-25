# NAJIK Admin Panel - Role-Based Access Control (RBAC)

## Overview

Production-grade RBAC system with enterprise security features:
- 6 predefined roles with granular permissions
- Device verification for new logins
- Account lockout after 3 failed attempts
- Password history tracking (prevents reuse of last 5 passwords)
- Real-time staff management sync via SSE
- Password strength validation with live feedback

## Quick Start

### 1. Initialize RBAC System

```bash
cd backend
python manage.py migrate
python manage.py setup_rbac
```

### 2. Create Super Admin

```bash
python manage.py create_super_admin
# Enter email and password when prompted
```

### 3. Login

Navigate to `http://localhost:3000/admin/login` and use your super admin credentials.

**Device Verification**: First login from a new device requires verification code **1234** (until email provider is configured).

## Roles & Permissions

### Super Admin
- **Full system access**
- Can manage all staff accounts
- Can assign/revoke roles and permissions
- Cannot be demoted by other admins

### Admin
- Manage users, listings, KYC, payments
- Approve/reject content
- View analytics
- Cannot manage staff accounts

### Moderator  
- Review and moderate listings
- Handle user reports
- Approve/reject content
- Send notifications

### Verification Officer
- Process KYC applications
- Verify user identities
- View user profiles
- Update verification status

### Support Agent
- View user data (read-only)
- Update user information
- View reports
- Send notifications

### Business Manager
- View analytics and metrics
- Manage payments
- Create/manage ads
- Export business data

## Security Features

### Password Requirements
- Minimum 8 characters
- 1 uppercase letter
- 1 lowercase letter  
- 1 number
- 1 special character (@$!%*?&)
- Cannot reuse last 5 passwords

### Account Lockout
- 3 failed login attempts = 10-minute lockout
- Automatic unlock after timeout
- All login attempts logged with IP/device info

### Device Verification
- New device login triggers email verification
- Trusted devices valid for 90 days
- Verification code: **1234** (temporary, until email configured)

### Rate Limiting
- Login: 3 attempts/minute
- Staff API: 100 requests/minute
- Staff creation: 5 accounts/hour

## API Endpoints

### Authentication
```
POST   /api/admin/auth/login/                    # Login
POST   /api/admin/auth/verify-email/             # Verify device
POST   /api/admin/auth/resend-verification/      # Resend code
POST   /api/admin/auth/logout/                   # Logout
POST   /api/admin/auth/refresh/                  # Refresh token
GET    /api/admin/auth/me/                       # Get current user
POST   /api/admin/auth/me/password/              # Change password
```

### Staff Management (Super Admin Only)
```
GET    /api/admin/auth/staff/                    # List all staff
POST   /api/admin/auth/staff/                    # Create staff
GET    /api/admin/auth/staff/:id/                # Get staff details
PATCH  /api/admin/auth/staff/:id/                # Update staff
DELETE /api/admin/auth/staff/:id/                # Deactivate staff
POST   /api/admin/auth/staff/:id/reset-password/ # Reset password
```

### Utilities
```
POST   /api/admin/auth/password/check-strength/  # Validate password
GET    /api/admin/auth/roles/                    # List all roles
```

## Frontend Usage

### Check Permissions
```typescript
import { useSession } from "@/lib/session";

function MyComponent() {
  const { user } = useSession();
  
  // Check single permission
  if (user?.permissions?.includes('users.view')) {
    // Show users page
  }
  
  // Check super admin
  if (user?.is_super_admin) {
    // Show staff management
  }
}
```

### Create Staff Member
```typescript
import { createStaffMember } from "@/lib/staff-api";

await createStaffMember({
  email: "admin@najik.com",
  full_name: "Admin User",
  password: "SecurePass@123",
  role_id: "role-uuid",
  is_super_admin: false,
});
```

## Database Models

### StaffUser
- Email, password, full name
- Role assignment
- Security flags (is_active, is_locked, must_change_password)
- Failed login tracking
- Audit timestamps

### Role
- Code, name, description
- Active/inactive flag
- Immutable once created

### Permission  
- Resource + action (e.g., "users.view")
- Description

### RolePermission
- Many-to-many: Role ↔ Permission
- Audit trail (who granted, when)

### StaffPermission
- Direct permission overrides per staff
- Can grant OR deny specific permissions
- Optional expiry date

### PasswordHistory
- Tracks last 5 passwords per staff
- Prevents password reuse

### LoginAttempt
- All login attempts (success + failure)
- IP address, device fingerprint, user agent
- Used for security monitoring

### TrustedDevice
- Devices that don't require verification
- 90-day expiry, auto-renewed on use

### EmailVerificationCode
- 6-digit codes for new device login
- 10-minute expiry
- One-time use

## Real-time Sync

Staff changes broadcast via Server-Sent Events (SSE):

```typescript
// Admin dashboard automatically refreshes when:
- Staff member created
- Staff member updated
- Staff member deleted/deactivated
```

Requires `REDIS_URL` environment variable for production.

## Configuration

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/najik
DJANGO_SECRET_KEY=your-secret-key
JWT_SIGNING_KEY=your-jwt-key

# Optional (for real-time sync)
REDIS_URL=redis://localhost:6379/0

# Email (when configured)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=noreply@najik.com
```

### Django Settings

Rate limits configured in `backend/config/settings.py`:
```python
"DEFAULT_THROTTLE_RATES": {
    "staff_login": "3/min",
    "staff_api": "100/min",
    "staff_create": "5/hour",
}
```

## Troubleshooting

### "Account locked" error
- Wait 10 minutes for automatic unlock
- Or: Super admin can manually unlock via database:
  ```sql
  UPDATE staff_staffuser SET is_locked = false, locked_until = NULL WHERE email = 'user@email.com';
  ```

### "Cannot reuse recent password"
- Password history tracks last 5 passwords
- Choose a new password not used recently

### Device verification not working
- Temporarily using code **1234** until email provider configured
- Check `EmailVerificationCode` table for generated codes
- Codes expire after 10 minutes

### Permission denied errors
- Check user's role and assigned permissions
- Super admins bypass all permission checks
- Use Django admin to manually adjust permissions if needed

## Security Best Practices

1. **Never share credentials** - Each staff member should have their own account
2. **Use strong passwords** - Follow password requirements
3. **Regular audits** - Review `LoginAttempt` table for suspicious activity
4. **Revoke access immediately** - Deactivate accounts when staff leave
5. **Principle of least privilege** - Assign minimum required permissions
6. **Monitor locked accounts** - Investigate repeated lockouts
7. **Keep passwords fresh** - Encourage periodic password changes
8. **Trust device management** - Review and revoke trusted devices periodically

## Next Steps

1. **Configure Email Provider** - Replace code "1234" with real email verification
2. **Add Audit Logs** - Track all permission changes and staff actions
3. **2FA/MFA** - Add optional two-factor authentication
4. **Session Management** - Allow staff to view/revoke active sessions
5. **Permission Templates** - Create permission sets for common workflows
6. **Bulk Operations** - Import/export staff accounts
7. **Compliance Reports** - Generate access control reports for audits

## Support

For issues or questions:
- Check Django logs: `backend/logs/`
- Review login attempts: `LoginAttempt` table
- Contact super admin for permission issues
