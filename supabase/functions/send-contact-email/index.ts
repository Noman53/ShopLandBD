import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: ContactPayload = await req.json();

    // Validate
    if (!payload.name || !payload.phone || !payload.subject || !payload.message) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Input length validation to prevent abuse
    if (payload.name.length > 200 || payload.phone.length > 20 || 
        payload.subject.length > 500 || payload.message.length > 5000 ||
        (payload.email && payload.email.length > 255)) {
      return new Response(JSON.stringify({ success: false, error: 'Input too long' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Fetch store email dynamically
    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('key, value')
      .in('key', ['store_email', 'store_name']);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { key: string; value: string | null }) => {
      settings[s.key] = s.value || '';
    });

    const storeEmail = settings.store_email;
    const storeName = settings.store_name || 'ShopLandBD';

    if (!storeEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Store email not configured' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${escapeHtml(storeName)}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">📩 New Contact Form Message</p>
  </div>
  <div style="padding:24px;">
    <div style="background:#f8fafb;border-radius:8px;padding:16px;margin-bottom:16px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#555;text-transform:uppercase;">Sender Details</h3>
      <p style="margin:4px 0;font-size:14px;"><strong>${escapeHtml(payload.name)}</strong></p>
      <p style="margin:4px 0;font-size:14px;">📞 ${escapeHtml(payload.phone)}</p>
      ${payload.email ? `<p style="margin:4px 0;font-size:14px;">✉️ ${escapeHtml(payload.email)}</p>` : ''}
    </div>
    <div style="margin-bottom:16px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#555;text-transform:uppercase;">Subject</h3>
      <p style="font-size:15px;color:#333;margin:0;">${escapeHtml(payload.subject)}</p>
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:16px;">
      <h3 style="margin:0 0 8px;font-size:14px;color:#555;text-transform:uppercase;">Message</h3>
      <p style="font-size:14px;color:#333;margin:0;white-space:pre-wrap;">${escapeHtml(payload.message)}</p>
    </div>
  </div>
  <div style="background:#f8fafb;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#999;">This message was sent from the ${escapeHtml(storeName)} contact form.</p>
  </div>
</div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${storeName} Contact <onboarding@resend.dev>`,
        to: [storeEmail],
        subject: `📩 Contact Form: ${payload.subject} - ${payload.name}`,
        html,
        reply_to: payload.email || undefined,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Resend API error:', res.status, errBody);
      return new Response(JSON.stringify({ success: false, error: 'Failed to send email' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Contact email error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Email sending failed' }), {
      status: 200,
      headers: corsHeaders,
    });
  }
});
