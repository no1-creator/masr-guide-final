# Masr Guide — Backend API + Live App

Zero-dependency Node.js backend for the multi-vendor tourism platform (Egypt),
plus a **live web app wired to the API** (`public/app.html`).
Built on Node's built-in `node:http`, `node:sqlite`, and `node:crypto` — **no `npm install` needed**.

## Requirements
- Node.js **>= 22.5** (uses the built-in `node:sqlite`). Tested on Node 24.

## Run
```bash
node server.js          # starts on http://localhost:4000 (auto-seeds demo data on first run)
# or
npm start
```
Then open:
- **http://localhost:4000/app.html** — the live app connected to the API (public catalog + booking + 3 role dashboards).
- **http://localhost:4000/** — the original polished prototype.

Reseed anytime:
```bash
npm run reset           # wipe + reseed demo data
```
Smoke test the API (server must be running):
```bash
bash test.sh
```

## Configuration (optional, via env or .env)
| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | 4000 | HTTP port |
| `JWT_SECRET` | dev secret | HMAC secret for JWT — **set in production** |
| `DB_PATH` | ./data/app.db | SQLite file location |
| `PUBLIC_URL` | https://masr.guide | Base for affiliate referral links |

## Demo accounts (seeded)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@masrguide.com | admin123 |
| Vendor | vendor@rodina.com | vendor123 |
| Affiliate | ivan@aff.com | aff123 |
| Customer | tourist@example.com | tourist123 |

## The live app (public/app.html)
A single-file vanilla-JS SPA that talks to the API on the same origin (no CORS setup needed):
- **Public:** banner slider (clickable → book), categories, search/sort, service detail with image gallery, availability, reviews, and booking.
- **Referral capture:** opening `?ref=CODE` stores the referral and registers a click; bookings made afterwards credit that marketer.
- **Auth:** login / register, role-aware.
- **Dashboards:** Admin (overview, providers approval, services, banners CRUD, marketers, bookings), Vendor (services with unlimited image upload, marketers, bookings, wallet, profile), Affiliate (referral link + QR, bookings, wallet + payout requests).

## Auth
`POST /api/auth/login` → `{ token, user }`. Send `Authorization: Bearer <token>` on protected routes.
Roles: `admin`, `vendor`, `affiliate`, `customer`. Admin can access everything.

## Endpoints
### Auth
- `POST /api/auth/register` `{ email, password, name?, role?, lang? }`
- `POST /api/auth/login` `{ email, password }`
- `GET  /api/auth/me`

### Catalog (public reads)
- `GET /api/categories`
- `GET /api/services` — filters: `?cat=&q=&city=&featured=1&sort=price_asc|price_desc|rating|newest`
- `GET /api/services/:id` — includes images, vendor, availability
- `GET /api/availability?service_id=`
- `GET /api/reviews?service_id=`
- `GET /api/banners` (`?all=1` for admin to include inactive)

### Vendor / services (auth: vendor/admin)
- `POST /api/services` `{ title, category_key, location, description, price, duration, images:[], featured? }`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`
- `POST /api/services/:id/images` `{ url }` or `{ images:[...] }` — **unlimited images**
- `DELETE /api/images/:id`
- `POST /api/availability` `{ service_id, date, slots }`
- `GET /api/vendors/me`, `PUT /api/vendors/me`

### Affiliates / marketers
- `GET /api/affiliates` (vendor: own marketers / admin: all)
- `POST /api/affiliates` `{ email, name?, commission_rate?, code? }` — creates marketer + account
- `PUT /api/affiliates/:id` `{ commission_rate }`, `DELETE /api/affiliates/:id`
- `GET /api/affiliates/me` (affiliate) → profile + referral `link`
- `POST /api/track/:code` — records a referral click (public)

### Bookings & commissions
- `GET /api/bookings` — auto-scoped by role (customer/vendor/affiliate); `?status=`
- `POST /api/bookings` `{ service_id, date?, pax?, referral_code? }` — computes commission split
- `PUT /api/bookings/:id/status` `{ status: confirmed|completed|cancelled }` — on `completed`, wallets are credited
- `GET /api/commissions` (admin)

### Wallets & payouts
- `GET /api/wallets/me` → balance + transactions
- `POST /api/payouts` `{ amount }`
- `GET /api/payouts` (admin), `PUT /api/payouts/:id` `{ status: paid|approved|rejected }`

### Admin
- `GET /api/admin/overview` — stats, recent bookings, top affiliates
- `GET /api/vendors`, `PUT /api/vendors/:id/status` `{ status: approved|rejected|suspended|pending }`
- Banners CRUD: `POST/PUT/DELETE /api/banners`

## Commission model
On each booking: `platform_share = amount * platform_commission` (default 10%, in `settings`),
`affiliate_share = amount * affiliate.commission_rate` (only if a referral code is used),
`vendor_share = amount - platform_share - affiliate_share`.
Wallets are credited when the booking is marked **completed**.

## Data model
`users, vendors, categories, services, service_images, availability, affiliates, bookings, commissions, wallets, wallet_txns, payouts, reviews, banners, settings`.

## Automated test
`node run-test.mjs` boots the server, drives `app.html` in headless Chromium, and verifies the full flow (requires Playwright + Chromium installed locally).

## Notes / next steps
- Uploaded images in `app.html` are sent as data URLs for the demo; in production, store to object storage/CDN.
- Next: visual/font polish and additional interface pieces, then port the polished prototype styling onto the live app.
- For production: set `JWT_SECRET`, run behind HTTPS.
