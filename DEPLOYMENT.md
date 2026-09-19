# Vendura Deployment

## Render backend

Create a new Render Blueprint from this repository. The included `render.yaml`
uses `backend` as the service root, builds with `npm ci && npm run build`, starts
with `npm start`, and checks `/health`.

Add these secret environment values in Render:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `FRONTEND_URL` (use the Vercel URL after the frontend is deployed)

Render generates `JWT_SECRET`. Do not copy any `.env` file into GitHub.

## Vercel frontend

Import the same repository, set the Root Directory to `frontend`, and add:

- `VITE_API_URL=https://your-render-service.onrender.com/api`
- `NITRO_PRESET=vercel`

After Vercel deploys, update `FRONTEND_URL` in Render and redeploy the backend.

## Paystack webhook

In Paystack test-mode settings, set the webhook URL to:

`https://your-render-service.onrender.com/api/webhooks/paystack`

Keep test keys enabled until the complete order and payout flow passes.
