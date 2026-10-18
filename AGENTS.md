# Lilyan Pert (QR Menu Pro)

Multilingual restaurant & café management platform: QR menus, orders, receipts,
tables, analytics, reviews, marketing, backups and Web Push notifications.

## Stack

| Service | Image | Role |
| --- | --- | --- |
| `db`  | `postgres:16-alpine` | Persistent store (schema in `server/src/schema.sql`) |
| `api` | `node:22` | Express JSON API on **8000** (internal only) |
| `web` | `node:22` | Vite dev server on **5173**, published on host **3000**, proxies `/api` → `api:8000` |

The web app is the only public entry point, so the session cookie stays
same-origin (no cross-origin CORS in the dev sandbox).

## Running it

```bash
docker compose --project-name app --project-directory "$BASE44_PROJECT_ROOT" \
  -f docker-compose.base44.yml up -d --build
```

Both app services run from the bind-mounted source with live reload
(nodemon for the API, Vite HMR for the client) and install their dependencies
from the lockfile-free `package.json` on startup into named volumes.
Migrations and seed data run automatically on API boot and are idempotent.

### Sample accounts (seeded, development only)

| Email | Password | Role |
| --- | --- | --- |
| `owner@lilyan.app` | `lilyan1234` | Business Owner |
| `manager@lilyan.app` | `manager1234` | Manager |
| `staff@lilyan.app` | `staff1234` | Staff |
| `admin@lilyan.app` | `superadmin1234` | Super Admin |

## Things that are not obvious

- **Tenant isolation is enforced in SQL, not the UI.** Every business-owned
  table carries `business_id`, and `withBusiness()` in `server/src/auth.js`
  refuses a request unless the caller has an active membership for the business
  it resolves. A client-supplied `business_id` is only ever a request, never a
  grant.
- **Money is always recomputed server-side** from stored product rows
  (`routes/public.js`, `routes/orders.js`). Prices, discounts, tax and service
  charge from the client are ignored except as *input intent*.
- **Category vs. product state.** A product's stored `active` flag is never
  rewritten when its category toggles. Effective visibility is
  `product.active AND product.available AND category.active`.
- **`is_sample` flag.** Seeded rows are marked `is_sample` so *Reset Sample
  Data* can delete only demo content. `users`, `memberships` and `businesses`
  are never in the reset table list.
- **Backup registry.** `server/src/lib/backup-modules.js` is the single source
  of truth for both Full Backup and Backup by Sections. A full backup iterates
  the whole list, so a module cannot be silently dropped.
- **Web Push** is triggered from exactly one place — `pushNewOrder()` in
  `server/src/lib/push.js`, called only from the public order-creation route.
  Status changes never reach Web Push.
- **Receipt printing** uses one markup (`client/src/components/Receipt.jsx`)
  rendered into `#print-root`; `@media print` hides everything else so the roll
  prints as one continuous flow. `window.print()` is triggered only after the
  print-audit record is written.
- **Persian (`fa`)** is displayed with the Solar Hijri calendar and Iran-local
  time (`client/src/format.js`); all other languages use the business timezone.
- **Preview host allowlist.** `client/vite.config.js` appends
  `.${BASE44_SANDBOX_HOST_DOMAIN}` to `allowedHosts` **only** when
  `BASE44_PREVIEW_MODE === "1"`, and the platform's
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed through untouched.
  With the flag unset, the project's own configuration applies unchanged.
- **SESSION_SECRET** falls back to an ephemeral key so the app always boots;
  set it in the dashboard (delivered via `/run/base44/app.env`) to keep sessions
  valid across restarts. VAPID keys for Web Push are generated on first use and
  stored in `app_settings` — they are never exposed to the client except the
  public key.

## Verifying it works

```bash
curl -s localhost:3000/api/health            # {"ok":true,...}
curl -s -o /dev/null -w '%{http_code}' localhost:3000/   # 200
```
