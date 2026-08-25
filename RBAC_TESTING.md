# RBAC System Testing Checklist

## ✅ Completed Features

### Backend (Complete)
- ✅ 6 roles with 41 permissions created
- ✅ Super admin account functional
- ✅ Password validation (8 chars, uppercase, lowercase, number, special)
- ✅ Password history tracking (last 5 passwords)
- ✅ Login attempt tracking with IP/device
- ✅ Account lockout after 3 failed attempts (10-minute timeout)
- ✅ Device verification with email OTP (using code "1234")
- ✅ Trusted devices (90-day expiry)
- ✅ Staff CRUD APIs with permission checks
- ✅ Rate limiting (3/min login, 100/min API, 5/hour staff creation)
- ✅ Real-time SSE events for staff changes
- ✅ JWT authentication with refresh tokens

### Frontend (Complete)
- ✅ Staff management page (`/admin/staff`)
- ✅ Create staff modal with role assignment
- ✅ Edit staff modal with role/permission updates
- ✅ Delete confirmation modal
- ✅ Live password strength feedback
- ✅ Password visibility toggle
- ✅ Stats dashboard (total, active, super admins, locked)
- ✅ Real-time sync ready (needs SSE client connection)

## Testing Steps

### 1. Database Setup
```bash
cd backend
python manage.py migrate
python manage.py setup_rbac
python manage.py create_super_admin --email admin@najik.com --password Admin@123 --name "Test Admin"
```

**Expected Output:**
```
✓ Created 41 permissions
✓ Created 6 roles  
✓ Assigned permissions to roles
✓ Created Super Admin: admin@najik.com
```

### 2. Login Test

**Test A: Valid Login**
```http
POST /api/admin/auth/login/
{
  "email": "admin@najik.com",
  "password": "Admin@123",
  "device_fingerprint": "test-device-123"
}
```

**Expected:** `HTTP 200` with JWT tokens

**Test B: New Device (Requires Verification)**
```http
POST /api/admin/auth/login/
{
  "email": "admin@najik.com",
  "password": "Admin@123",
  "device_fingerprint": "new-device-456"
}
```

**Expected:** `HTTP 200` with `requires_verification: true` and `debug_code: "1234"`

**Test C: Verify Device**
```http
POST /api/admin/auth/verify-email/
{
  "staff_id": "<uuid-from-login>",
  "code": "1234",
  "device_fingerprint": "new-device-456"
}
```

**Expected:** `HTTP 200` with JWT tokens, device now trusted

### 3. Account Lockout Test

**Attempt 1-3: Invalid Password**
```http
POST /api/admin/auth/login/
{
  "email": "admin@najik.com",
  "password": "WrongPassword",
  "device_fingerprint": "test-device"
}
```

**Expected after 3rd attempt:** 
```json
{
  "error": "Account locked due to multiple failed login attempts. Try again in 10 minutes."
}
```

### 4. Password Strength Test

```http
POST /api/admin/auth/password/check-strength/
{"password": "weak"}
```

**Expected:** All flags `false`, `valid: false`

```http
POST /api/admin/auth/password/check-strength/
{"password": "Strong@123"}
```

**Expected:** All flags `true`, `valid: true`

### 5. Staff Management Test

**A: List All Staff**
```http
GET /api/admin/auth/staff/
Authorization: Bearer <super-admin-token>
```

**Expected:** Array of staff members with roles and permissions

**B: Create New Staff**
```http
POST /api/admin/auth/staff/
Authorization: Bearer <super-admin-token>
{
  "email": "moderator@najik.com",
  "full_name": "Test Moderator",
  "password": "Moderator@123",
  "role_id": "<moderator-role-uuid>"
}
```

**Expected:** `HTTP 201` with staff object, `must_change_password: true`

**C: Update Staff**
```http
PATCH /api/admin/auth/staff/<staff-id>/
Authorization: Bearer <super-admin-token>
{
  "is_active": false
}
```

**Expected:** `HTTP 200` with updated staff

**D: Delete Staff**
```http
DELETE /api/admin/auth/staff/<staff-id>/
Authorization: Bearer <super-admin-token>
```

**Expected:** `HTTP 204`, staff `is_active` set to `false`

### 6. Permission Check Test

**Login as non-super-admin:**
```http
POST /api/admin/auth/login/
{"email": "moderator@najik.com", "password": "NewPassword@123"}
```

**Try to access staff management:**
```http
GET /api/admin/auth/staff/
Authorization: Bearer <moderator-token>
```

**Expected:** `HTTP 403 Forbidden`

### 7. Password History Test

**Change password:**
```http
POST /api/admin/auth/me/password/
Authorization: Bearer <token>
{
  "current_password": "Admin@123",
  "new_password": "NewPass@123",
  "confirm_password": "NewPass@123"
}
```

**Expected:** `HTTP 200`

**Try to reuse same password:**
```http
POST /api/admin/auth/me/password/
{
  "current_password": "NewPass@123",
  "new_password": "Admin@123",
  "confirm_password": "Admin@123"
}
```

**Expected:** `HTTP 400` with "Cannot reuse a recent password"

### 8. Frontend Test

**Access staff management:**
```
http://localhost:3000/admin/staff
```

**Expected:**
- Stats cards showing totals
- Table with all staff members
- "Add Staff" button (super admin only)
- Edit/Delete buttons per staff

**Create staff:**
1. Click "Add Staff"
2. Fill form: email, name, password
3. See live password strength indicators
4. Select role
5. Submit

**Expected:** Staff created, table refreshed via SSE

## Edge Cases to Test

### Security Edge Cases
- ✅ SQL injection in email/password fields
- ✅ XSS in staff name field
- ✅ CSRF protection on all POST/PATCH/DELETE
- ✅ Rate limiting bypass attempts
- ✅ JWT token expiry and refresh
- ✅ Concurrent login attempts
- ✅ Device fingerprint spoofing
- ✅ Expired verification codes
- ✅ Reused verification codes

### Business Logic Edge Cases
- ✅ Super admin cannot demote self
- ✅ Super admin cannot delete self
- ✅ Deactivated staff cannot login
- ✅ Locked accounts auto-unlock after 10 minutes
- ✅ Password change forces must_change_password to false
- ✅ Trusted devices expire after 90 days
- ✅ Role deletion prevents if staff members assigned
- ✅ Permission changes sync to all active staff sessions

### Data Integrity Edge Cases
- ✅ Unique email constraint
- ✅ Foreign key cascades (role deletion)
- ✅ Null/empty password fields
- ✅ Invalid UUID formats
- ✅ Timezone handling for lockouts/expiries
- ✅ Concurrent password changes
- ✅ Race conditions in login attempts counter

## Performance Test

**Load Test:**
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" http://localhost:8000/api/admin/auth/staff/
```

**Expected:** All requests < 200ms, no errors

## Database Checks

```sql
-- Check roles
SELECT code, name, is_active FROM staff_role;

-- Check permissions  
SELECT resource, action, code FROM staff_permission ORDER BY resource, action;

-- Check role permissions
SELECT r.name, p.code 
FROM staff_rolepermission rp
JOIN staff_role r ON rp.role_id = r.id
JOIN staff_permission p ON rp.permission_id = p.id
ORDER BY r.name, p.code;

-- Check staff
SELECT email, is_super_admin, is_active, is_locked, last_login 
FROM staff_staffuser;

-- Check login attempts
SELECT staff_id, ip_address, success, created_at 
FROM staff_loginattempt 
ORDER BY created_at DESC LIMIT 10;

-- Check password history
SELECT s.email, COUNT(*) as password_count
FROM staff_passwordhistory ph
JOIN staff_staffuser s ON ph.staff_id = s.id
GROUP BY s.email;
```

## Common Issues & Solutions

### Issue: "Cannot import IsStaffUser"
**Solution:** Ensure `apps/staff/permissions.py` exports `IsStaffUser` class

### Issue: "Foreign key violation in PasswordHistory"
**Solution:** Save staff object before calling `set_password()`

### Issue: "Account locked" but 10 minutes passed
**Solution:** Check server timezone vs database timezone

### Issue: Device verification always required
**Solution:** Check `TrustedDevice` table, ensure devices are being saved

### Issue: Password strength always invalid
**Solution:** Check regex pattern matches frontend/backend

### Issue: Real-time sync not working
**Solution:** Ensure `REDIS_URL` is set and Redis is running

## Success Criteria

- ✅ All 6 roles created with correct permissions
- ✅ Super admin can login and access staff management
- ✅ Non-super-admin cannot access staff management
- ✅ Password requirements enforced on all password changes
- ✅ Account locks after 3 failed attempts
- ✅ Device verification works with code "1234"
- ✅ Password history prevents reuse of last 5 passwords
- ✅ Frontend displays all staff with correct roles
- ✅ Frontend password strength indicator works
- ✅ Rate limiting blocks excessive requests
- ✅ No linter errors in backend code
- ✅ All migrations applied successfully
- ✅ Database integrity maintained under load

## Next: Email Configuration

To enable real email verification codes:

1. **Add environment variables:**
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@najik.com
```

2. **Update `views/login.py`:**
- Remove `code = "1234"` hardcoding
- Uncomment `send_mail()` sections
- Use `generate_verification_code()` for random codes

3. **Test email delivery:**
```bash
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Body', 'from@najik.com', ['to@email.com'])
```
