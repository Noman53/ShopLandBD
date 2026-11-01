import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve((req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: "Password recovery is handled by Supabase Auth email." }),
    {
      status: 410,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
});
