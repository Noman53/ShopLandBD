# ShopLandBD

ShopLandBD is a bilingual (Bangla and English) e-commerce storefront for customers in Bangladesh. Customers can browse products and categories, place orders, choose the payment methods available at checkout, track orders, and contact store support. The administration area manages products, orders, promotions, customers, and support conversations.

## Technology

- React 18, TypeScript, and Vite
- Tailwind CSS and Radix UI
- Supabase Auth, Postgres, Realtime, Storage, and Edge Functions
- React Router and TanStack Query

## Local development

Requirements: Node.js 20.19 or newer (or 22.12+) and npm.

```sh
npm ci
npm run dev
```

Create a local `.env` file with the public Supabase project settings:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
VITE_SITE_URL=https://shoplandbd.vercel.app
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are required for the client to start. Add them to the Vercel project's **Production** environment (and **Preview** if preview deployments are used), then redeploy after changing them. These values are included in the browser bundle; use only the Supabase publishable/anon key. Never expose a service-role key or other server secret in a `VITE_` variable.

`VITE_SITE_URL` sets the canonical URL used by SEO metadata and the sitemap. It defaults to `https://shoplandbd.vercel.app`.

## Validation and production build

```sh
npm test
npm run lint
npm run build
```

The build refreshes `public/sitemap.xml` from the configured public site URL and active product catalogue. Vercel should build with `npm run build` and serve the generated `dist` directory.

## Supabase deployment

The Supabase project reference is configured in `supabase/config.toml`. Before applying migrations to an existing database, check its migration history and apply only migrations that have not already run. Do not replay the initial schema migrations against a live database.

For a linked project, migrations can be applied with the Supabase CLI:

```sh
supabase link --project-ref vdanvxkgmvgpbkdkvhvy
supabase db push
```

Deploy the active Edge Functions as needed:

```sh
supabase functions deploy chat-ai
supabase functions deploy resolve-login
supabase functions deploy send-contact-email
supabase functions deploy send-order-emails
```

Configure the server-side `SITE_URL` Edge Function secret as `https://shoplandbd.vercel.app`. Configure any email-provider secrets required by the email functions in Supabase; keep them out of Vercel client variables and source control.

Password recovery uses Supabase Auth email delivery. Configure SMTP and allow the production `/reset-password` URL in Supabase Authentication URL Configuration. Phone-only accounts require an SMS provider for password recovery.

The support chat uses built-in bilingual support rules, order-status lookup, and an admin handoff. Order lookup depends on the chat-related SQL migrations being applied to the connected database.

## Routes

Public storefront routes include `/`, `/products`, `/categories`, `/track-order`, `/about`, `/contact`, `/returns`, `/terms`, `/privacy-policy`, `/forgot-password`, and `/reset-password`. Administrative routes are under `/admin`.
