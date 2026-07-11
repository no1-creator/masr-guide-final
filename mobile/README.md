# Masr Guide — Flutter Mobile App

A Flutter/Dart mobile app for **Masr Guide** (tourist services in Egypt — from arrival to departure).
It talks to the **same backend API and SQLite database** that powers the web control panel, so anything
you add/edit in the control panel (services, categories, banners, vendors, commissions) appears instantly
in the app, and every booking made in the app shows up in the control panel.

```
  [ Flutter mobile app ]  \
                            >--->  [ Node/Express REST API ]  --->  [ app.db (SQLite) ]
  [ Web control panel   ]  /
```

## What's inside

- **Explore**: banner slider (ads, clickable to a service), all 18 categories with modern icons, live
  search, sort (price / rating / newest), and the full services catalog.
- **Service detail**: multi-image gallery, description, availability, cancellation policy, reviews, and a
  booking sheet (date, travellers, contact) that creates a real booking via the API.
- **My Trips**: the signed-in user's bookings with status.
- **Account** (role-aware, same accounts/roles as the backend):
  - **Traveller**: profile, bookings.
  - **Service provider (vendor)**: business overview + wallet.
  - **Affiliate / marketer**: referral link + **QR code** + wallet.
  - **Admin**: platform overview (vendors, services, affiliates, bookings, revenue, commission).
  - Full management stays in the web control panel; the app mirrors the data.

## 1) Point the app at your backend

Edit `lib/config.dart` or (better) pass it at run time:

| Where you run the app        | API base URL                       |
|------------------------------|------------------------------------|
| Android emulator             | `http://10.0.2.2:4000`             |
| iOS simulator                | `http://localhost:4000`            |
| Real phone (same Wi-Fi)      | `http://<YOUR_COMPUTER_LAN_IP>:4000` |
| Production                    | `https://api.yourdomain.com`       |

## 2) Run it

```bash
# from the project folder
flutter create .            # generates android/ ios/ etc. (keeps lib/ & pubspec)
flutter pub get

# start your backend first (the Node server on port 4000), then:
flutter run --dart-define=API_BASE=http://10.0.2.2:4000
```

### Local HTTP on Android (dev only)
Android blocks plain `http://` by default. For local testing, add this to
`android/app/src/main/AndroidManifest.xml` on the `<application>` tag:

```xml
<application
    android:usesCleartextTraffic="true"
    ... >
```
(Not needed in production when you use `https://`.)

## 3) Test accounts (same as the backend seed)

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Admin    | admin@masrguide.com      | admin123    |
| Vendor   | vendor@rodina.com        | vendor123   |
| Affiliate| ivan@aff.com             | aff123      |
| Traveller| tourist@example.com      | tourist123  |

## Project structure

```
lib/
  main.dart              # app entry + bottom navigation
  config.dart            # API base URL
  theme.dart             # brand palette & Material 3 theme
  icons.dart             # category key -> icon mapping
  api.dart               # REST client (Bearer token)
  models.dart            # Category, Service, Banner, Booking, Wallet, User...
  state.dart             # AppState (provider/ChangeNotifier)
  widgets/               # NetImage, ServiceCard, BannerSlider, common UI
  screens/               # home, service detail, booking sheet, bookings,
                         # account/login, dashboard, wallet, affiliate
```

## API endpoints used (all already in your backend)

`GET /api/categories`, `GET /api/banners`, `GET /api/services` (`?cat=&q=&sort=`),
`GET /api/services/:id`, `GET /api/reviews?service_id=`, `POST /api/auth/login`,
`POST /api/auth/register`, `GET/POST /api/bookings`, `GET /api/wallets/me`,
`GET /api/affiliates/me`, `GET /api/vendors/me`, `GET /api/admin/overview`.

## Next steps (mobile roadmap)

- Payment gateway integration (same as the web plan).
- Push notifications for booking status.
- Multi-language (English now; add more — no Arabic per project scope).
- Offline caching of the catalog.

## Get it on your Android phone (3 ways)

### A) Easiest — build the APK in the cloud (no tools to install)
This repo includes a GitHub Actions workflow (`.github/workflows/build-apk.yml`) that
builds a ready-to-install APK for you.

1. Create a free GitHub account and a new repository.
2. Upload this project to it (or `git push`).
3. GitHub builds the APK automatically. Open the **Actions** tab → the latest run.
   - To point the app at your live backend, use **Run workflow** and set `api_base`
     to your server URL (e.g. `https://api.yourdomain.com`).
4. When it finishes, download the artifact **masr-guide-apk** (it's a zip containing
   `app-release.apk`).
5. Send `app-release.apk` to your phone (WhatsApp/Drive/USB), tap it, allow
   "Install from unknown sources", and install.

### B) Build the APK on your own computer
1. Install **Flutter** (flutter.dev/docs/get-started) + **Android Studio**.
2. In this folder:
   ```bash
   flutter create .
   flutter pub get
   flutter build apk --release --dart-define=API_BASE=https://api.yourdomain.com
   ```
3. The APK is at `build/app/outputs/flutter-apk/app-release.apk` — copy it to your
   phone and install.

### C) Run live on a plugged-in phone (for development)
1. Enable **Developer options** + **USB debugging** on the phone, plug it in.
2. Start your backend, then:
   ```bash
   flutter run --dart-define=API_BASE=http://<YOUR_PC_LAN_IP>:4000
   ```
   (Phone and PC on the same Wi-Fi. `usesCleartextTraffic` is needed for http — the
   cloud workflow adds it automatically; for local runs add it to AndroidManifest.xml.)

> The app needs a reachable backend to show data. For a real phone, either host the
> backend on a public https URL, or run it on your PC and use the PC's LAN IP while
> both devices share the same Wi-Fi.
