# Delivery integration: sandbox readiness

## What is implemented

The existing checkout and orders remain in place. Courier quotes are grouped per vendor, saved server-side, expire after 30 minutes, and are bound to the buyer, destination and cart quantities. Selected quotes determine delivery charges on the backend. A successful Paystack verification invokes an idempotent sandbox booking; courier failures do not reverse payment or start a second charge. Existing shipping evidence, disputes, customer confirmation and payout checks remain authoritative.

The provider interface exposes explicit capabilities. The only installed adapter is **Vendraza Sandbox Courier**. Its quotations, timing and references are deliberately fictional test fixtures. It does not dispatch riders, provide GPS, receive provider webhooks or supply proof of delivery. Admin test events never advance the real order or release money. Vendors may mark packages ready, but may not submit provider events. Tracking supports an authenticated server-sent event stream and periodic refresh.

## Enable locally

The Render blueprint now sets `LOGISTICS_MODE=sandbox` for owner testing. For an existing Render service not managed by blueprint synchronization, set this variable in Render > Environment and redeploy. Keep `PAYSTACK_SECRET_KEY` on a test key for this flow; do not replace a live payment key merely to test delivery on the public shop. Use a separate test deployment in that case. Frontend API settings must point at the backend deployment containing these routes.

The database migration is a separate deployment step: pushing code does not execute SQL. Open the active Supabase project's SQL Editor, run the migration below once, and verify the `logistics_records` table exists before checkout testing. No existing orders, products or balances are deleted by this migration. After testing, set `LOGISTICS_MODE=disabled` until a real courier adapter is ready.

1. Run `supabase/migrations/202610120001_logistics.sql` in the project's Supabase SQL editor. Browser access is blocked by RLS; the backend service role owns access.
2. Set backend `LOGISTICS_MODE=sandbox`. Development defaults to sandbox; production defaults to disabled. Use only a Paystack test key. Live keys are rejected for sandbox quotes and sandbox orders.
3. Restart the backend and frontend. In checkout enter a full address, compare sandbox couriers, and select one option for **each** vendor. Complete a test payment. Open order details and select Track courier delivery.
4. Admin > Logistics can advance test shipment statuses. Vendor > Delivery lists bookings and package readiness. Cancellation creates an administrator refund-review flag; it does not issue a Paystack refund or cancel the merchandise order.
5. For interactive maps set frontend `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID`, enable Maps JavaScript API and Geocoding API, restrict the browser key by allowed website referrers and API scope, then restart/rebuild. Without a key, manual address entry and browser GPS remain available. Coordinates do not replace customer address confirmation. The default demo map ID is for development; supply your own map ID for deployment.

## Provider research

Terminal Africa documents rates, parcels, addresses, shipments, arrange-pickup and shipment tracking, with webhook updates:
- https://docs.terminal.africa/tship
- https://docs.terminal.africa/tship/ship-with-code
- https://docs.terminal.africa/tship/rate/get-rates-for-shipment

Gokada advertises API integration at https://www.gokada.ng/business but no authenticated technical contract has been verified here. No Gokada adapter is installed. No live GPS or proof-of-delivery capability is inferred from marketing claims.

## Required before real bookings

Courier-selected delivery fees are recorded separately as reserved courier charges, with no vendor owner. They do not become vendor earnings or withdrawable platform fees when customer receipt is confirmed. Existing vendor-arranged delivery accounting is unchanged. Real provider settlement and delivery-fee refunds still require a reconciliation policy before launch.

Create a provider business account and obtain its sandbox credentials, API contract and signed-webhook documentation. Store provider secrets **only on the backend**. Implement and contract-test that adapter before enabling live delivery. Do not route live deliveries to the test adapter. Provide structured, confirmed pickup addresses and parcel measurements for every vendor/product; fallback parcel measurements are permitted only in sandbox fixtures. Configure coverage from actual provider availability.

Live operation additionally requires durable booking claims and a transactional outbox/worker, provider idempotency or reconciliation for ambiguous requests, retry/backoff and cancellation/refund policies, authenticated webhook deduplication and event ordering, secure evidence storage and authorized evidence access, delivery PIN handling only when documented, and integration tests using provider credentials. Current booking locks are process-local and sandbox-only; they are not a multi-instance live booking guarantee.

Paystack currently verifies customer charges through its callback verification endpoint; the existing webhook handles refunds and transfers. This change hooks the existing verified-payment path, and does not introduce a new charge-success webhook. For unattended live bookings, implement signed charge-success handling plus an outbox so closing the callback page cannot prevent fulfillment.

## Remaining verification boundaries

Real quotation availability, real dispatch, GPS, ETAs, provider webhooks, proof of delivery, automated provider cancellation/refunds, map rendering/geocoding with a real key, and courier delivery ratings cannot be validated without connected accounts. They are not production-complete. Sandbox cancellation requires manual review; it does not claim a refund was sent. A provider-reported completion alone must never release seller earnings. Existing customer non-response/admin-review and escrow protection rules remain in force.
