ShopLandBD is a bilingual e-commerce application for customers in Bangladesh. It includes a product catalogue, cart and checkout, order tracking, customer accounts, and an administration area.

## Technology

- React 18, TypeScript, and Vite
- Tailwind CSS and Radix UI
- Supabase Auth, Postgres, Realtime, and Edge Functions

## Development

Requirements: Node.js 20.19 or newer (or 22.12+) and npm.

```sh
npm ci
npm run dev
```

The local Vite server runs on port `8080`. Create a local `.env` file with:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never put a Supabase service-role key or third-party API secret in a `VITE_` variable. Configure server-only secrets in Supabase Edge Function secrets.

## Validation and production build

```sh
npm test
npm run lint
npm run build
```

The pre-build script refreshes `public/sitemap.xml` from the configured public site URL and active product catalogue. The production URL defaults to `https://shoplandbd.vercel.app`; set `VITE_SITE_URL` to the canonical production origin when building for deployment.

## Supabase

Deploy the retired `send-reset-otp` and `verify-reset-otp` function stubs, apply the SQL migrations in `supabase/migrations`, then deploy the active functions in `supabase/functions`. Configure `SITE_URL` as `https://shoplandbd.vercel.app` in Supabase Edge Function secrets.

Configure Supabase Auth email/SMTP delivery and allow the production `/reset-password` URL in Authentication URL Configuration. Password recovery requires an email address registered with Supabase Auth; phone-only accounts need an SMS provider. Chat responses use built-in support rules and order lookup; no third-party AI API key or paid chat service is required.

Public storefront routes include `/`, `/products`, `/categories`, `/track-order`, `/about`, `/contact`, `/returns`, `/terms`, `/privacy-policy`, `/forgot-password`, and `/reset-password`. Administrative routes are under `/admin`.
