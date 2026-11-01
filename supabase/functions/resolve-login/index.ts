import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isAllowedOrigin } from "../_shared/cors.ts";

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(value: string) {
  let phone = value.replace(/[\s-]/g, "");
  if (phone.startsWith("+880")) phone = phone.slice(4);
  else if (phone.startsWith("880")) phone = phone.slice(3);
  if (phone.startsWith("1") && phone.length === 10) phone = `0${phone}`;
  return phone;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) return jsonResponse({ error: "Origin is not allowed" }, 403, corsHeaders);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Invalid request" }, 400, corsHeaders);
    }

    const { identifier, password } = body as { identifier?: unknown; password?: unknown };
    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      identifier.length > 100 ||
      password.length > 256
    ) {
      return jsonResponse({ error: "Invalid phone or password" }, 401, corsHeaders);
    }

    const phone = normalizePhone(identifier.trim());
    if (!/^(?:\+?880|0)?1[3-9]\d{8}$/.test(identifier.trim().replace(/[\s-]/g, ""))) {
      return jsonResponse({ error: "Invalid phone or password" }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Login service is missing Supabase configuration");
      return jsonResponse({ error: "Login service is not configured" }, 500, corsHeaders);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: profiles, error: profileError } = await adminClient
      .from("profiles")
      .select("email, user_id")
      .eq("phone", phone)
      .limit(5);

    if (profileError) {
      console.error("Failed to resolve phone login:", profileError.message);
      return jsonResponse({ error: "Login service is temporarily unavailable" }, 500, corsHeaders);
    }

    const possibleEmails = new Set<string>([`${phone}@phone.local`]);
    for (const profile of profiles ?? []) {
      if (profile.email) possibleEmails.add(profile.email);
      if (profile.user_id) {
        const { data, error } = await adminClient.auth.admin.getUserById(profile.user_id);
        if (error) {
          console.error("Could not retrieve account for phone login:", error.message);
        } else if (data.user.email) {
          possibleEmails.add(data.user.email);
        }
      }
    }

    for (const email of [...possibleEmails].slice(0, 6)) {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        return jsonResponse({
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type,
          },
        }, 200, corsHeaders);
      }
    }

    return jsonResponse({ error: "Invalid phone or password" }, 401, corsHeaders);
  } catch (error) {
    console.error("Phone login failed:", error);
    return jsonResponse({ error: "Login service encountered an error" }, 500, corsHeaders);
  }
});
