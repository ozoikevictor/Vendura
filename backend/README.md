# Vendura API

Backend API for the Vendura marketplace. It provides authentication, catalog, stores, vendor inventory, orders and escrow, messaging and offers, notifications, addresses, subscriptions, payouts, delivery settings, and dashboard analytics.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609190001_initial_schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET`.
4. Run `npm install`.
5. Run `npm test`.
6. Run `npm run dev`.

Keep `SUPABASE_SERVICE_ROLE_KEY` on the backend only. Never expose it through Vite or place it in the frontend environment.

The API is available at `http://localhost:4000`; health is at `GET /health`. All responses use `{ "data": ... }` for success and `{ "error": { "message": ... } }` for errors.

## Demo accounts

After the first database startup, these seeded accounts all use `Password123!`:

- `customer@vendura.test`
- `vendor@vendura.test`
- `admin@vendura.test`

## Route groups

- `/api/auth`: registration, login, current user, email verification, password reset
- `/api/users/me`: profile and delivery addresses
- `/api/categories`, `/api/stores`, `/api/products`: public catalog
- `/api/vendor/products`: vendor inventory
- `/api/orders`, `/api/vendor/orders`: checkout and fulfilment
- `/api/conversations`, `/api/offers`: messaging and negotiation
- `/api/notifications`: user notifications
- `/api/vendor`: store settings, analytics, finance, subscription, and delivery
- `/api/plans`: public subscription plans

Payment processing, transactional email/SMS, bank verification, and media uploads require provider credentials and are intentionally represented by secure integration boundaries rather than fake third-party calls.
