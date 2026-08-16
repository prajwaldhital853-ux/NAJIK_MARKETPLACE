# NAJIK — Everything near you

Nepal local marketplace.

- **User app** (iOS + Android via Expo Go): `apps/mobile`
- **Admin website**: `apps/admin` at `/admin`
- **API**: Django + PostgreSQL in `backend`

Feature 1 is auth only. Listings, chat, and maps are separate Django apps, still empty until we build those features.

## Layout

```
backend/
  config/             Django project settings
  apps/
    accounts/         App user register/login (split views)
    staff/            Admin staff login
    core/             Health check
    categories/       (next)
    listings/         (next)
    chat/             (next)
    ...
apps/mobile/          Expo Go — iOS and Android
apps/admin/           Next.js staff website
```

## Run locally

PostgreSQL 18 must be running. This project does **not** use SQLite.

### 1. API (listen on all interfaces so Expo Go can connect)

```bash
cd backend
venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

Health: http://127.0.0.1:8000/api/health/

Local Super Admin: `owner@najik.local` / `ChangeMeNow!23`

### 2. Admin website (desktop)

```bash
cd apps/admin
npm run dev
```

http://localhost:3000/admin/login

### 3. User app in Expo Go (iPhone or Android)

1. Install **Expo Go** from the App Store or Play Store.
2. Phone and PC on the **same Wi-Fi**.
3. `apps/mobile/.env` must use your PC LAN IP, not 127.0.0.1:

```
EXPO_PUBLIC_API_URL=http://192.168.1.3:8000
```

4. Start Expo:

```bash
cd apps/mobile
npx expo start --lan
```

Use Node from `D:\nodejs` if `npx` errors with `cb.apply is not a function`.

5. Scan the QR code with Expo Go (Android) or the Camera app (iPhone).

If the phone cannot reach the API, allow port 8000 in Windows Firewall, or run `npx expo start --tunnel`.

## Next feature

Staff RBAC (Super Admin, Admin, Moderator, Verification Officer, Support Agent, Business Manager).
