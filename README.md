# Borewell Connect

A marketplace connecting customers who need borewells drilled with verified borewell drilling companies. Customers post a drilling request (district, mandal, land type, expected depth, location); nearby companies bid a per-foot price; quotes are ranked by a blended **price + rating + distance** score; the customer books their pick, pays a ₹500 platform booking fee, and only then are contact details exchanged in both directions. Owners track job milestones through completion, which auto-generates the invoice; customers rate & review afterwards. An admin portal oversees users, company verification, bookings, and revenue analytics.

Implemented from the Claude Design prototype in `project/Borewell Connect Prototype.dc.html` (design chats in `chats/`).

## Structure

| Path | What it is |
|---|---|
| `apps/api` | Node.js + Express + Prisma (PostgreSQL) backend. MSG91 OTP auth, Razorpay booking-fee payments, JWT sessions. |
| `apps/mobile` | Expo (React Native) app — **Customer** and **Borewell Owner** flows, iOS/Android/web. |
| `apps/admin` | React (Vite) web **Admin Portal** — dashboard, company verification, bookings, analytics. |
| `packages/shared` | Shared design tokens, constants, and the blended-ranking formula. |
| `project/`, `chats/` | Original design handoff bundle (prototype + transcripts). |

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- PostgreSQL 14+ (local service or Docker)

## Setup

```bash
pnpm install

# 1. Database — either a local service or:
docker run -d --name borewell-pg \
  -e POSTGRES_USER=borewell -e POSTGRES_PASSWORD=borewell \
  -e POSTGRES_DB=borewell_connect -p 5432:5432 postgres:16-alpine

# 2. API
cp apps/api/.env.example apps/api/.env      # adjust DATABASE_URL if needed
pnpm --filter @borewell/api prisma:migrate  # creates tables
pnpm --filter @borewell/api prisma:seed     # admin login + 5 sample companies
pnpm api:dev                                # http://localhost:4000

# 3. Admin portal
cp apps/admin/.env.example apps/admin/.env
pnpm admin:dev                              # http://localhost:5173

# 4. Mobile app
cp apps/mobile/.env.example apps/mobile/.env  # set your LAN IP for physical devices
pnpm mobile:start                             # Expo — press w for web, or scan QR in Expo Go
```

Seeded logins:

- **Admin portal**: `admin@borewellconnect.com` / `Admin@123`
- **Owner app**: any seeded company phone, e.g. `9876511111` (Sri Sai Borewells)
- **Customer app**: any 10-digit number — first OTP login creates the account

## Test / sandbox integrations

Both third-party integrations run fully wired but degrade gracefully to a **mock mode** when no credentials are set, so the entire flow works out of the box:

- **MSG91 (OTP SMS)** — with `MSG91_MOCK_OTP=true` (default) OTP codes are printed to the API server console instead of being sent by SMS. Add `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` and set `MSG91_MOCK_OTP=false` to send real SMS.
- **Razorpay (booking fee)** — with no `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, orders and signature checks use a deterministic mock so payment succeeds in-app. Add your `rzp_test_…` keys for real sandbox checkout (the app opens Razorpay's hosted checkout in a WebView), and live keys for production. A `POST /webhooks/razorpay` endpoint handles `payment.captured` events (set `RAZORPAY_WEBHOOK_SECRET`).

Swapping mock → sandbox → production requires only `.env` changes, no code changes.

## Business rules encoded

- Owners see **anonymised leads** (district/mandal, land type, depth, preferred date) — never customer identity, contact, or exact coordinates. Blind bidding: owners can't see competitors' prices.
- Quote ranking is a blended score: `rating×20 − price×0.12 − distance×2.5` (same formula the design prototype validated).
- The ₹500 booking fee is the platform's commission, collected upfront via Razorpay; the balance is payable offline to the company. Contact details are exchanged **only after payment**.
- Completing the final milestone ("Work Completed") closes the job and auto-generates the invoice: `depth × price/ft + machine & casing − booking fee`.
- Reviews update the company's average rating, which feeds back into future quote ranking.
- New owner signups start **PENDING** and must be verified in the admin portal before they can operate as verified companies.
