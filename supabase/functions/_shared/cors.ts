const DEFAULT_SITE_URL = "https://shoplandbd.vercel.app";
const LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getAllowedOrigins() {
  const configuredOrigins = [
    Deno.env.get("SITE_URL") || DEFAULT_SITE_URL,
    ...(Deno.env.get("ADDITIONAL_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...LOCAL_ORIGINS,
  ];

  return new Set(configuredOrigins.map((value) => new URL(value).origin));
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  // Allow any localhost and 127.0.0.1 on any port (for vite dev / preview servers)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Allow all vercel deployments (preview branches and production)
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/.test(origin)) return true;
  return getAllowedOrigins().has(origin);
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "authorization, x-session-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
