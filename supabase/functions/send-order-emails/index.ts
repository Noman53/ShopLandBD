import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

interface OrderData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  subtotal: number;
  total: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  product_name_bn: string;
  product_name_en: string;
  quantity: number;
  price: number;
}

const generateOrderEmailHtml = (
  order: OrderData,
  items: OrderItem[],
  storeName: string,
  storePhone: string,
  isAdmin: boolean
): string => {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const paymentLabel = order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery';
  const subtotal = order.subtotal;
  const total = order.total;
  const deliveryCharge = total - subtotal;

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;">${escapeHtml(item.product_name_en)}<br/><span style="color:#888;font-size:12px;">${escapeHtml(item.product_name_bn)}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;">৳${item.price.toLocaleString()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;">৳${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const title = isAdmin
    ? `🛒 New Order #${shortId}`
    : `✅ Order Confirmed #${shortId}`;

  const greeting = isAdmin
    ? `<p style="font-size:15px;color:#333;">A new order has been placed. Here are the details:</p>`
    : `<p style="font-size:15px;color:#333;">Dear <strong>${escapeHtml(order.customer_name)}</strong>,</p>
       <p style="font-size:15px;color:#333;">Thank you for your order! We've received it and will process it shortly. Here's your order summary:</p>`;

  const footer = isAdmin
    ? `<p style="font-size:13px;color:#888;">This is an automated notification from ${escapeHtml(storeName)}.</p>`
    : `<p style="font-size:15px;color:#333;">We will contact you before delivery at <strong>${escapeHtml(order.customer_phone)}</strong>.</p>
       <p style="font-size:15px;color:#333;">If you have any questions, please call us at <strong>${escapeHtml(storePhone)}</strong>.</p>
       <p style="font-size:14px;color:#888;margin-top:24px;">Thank you for shopping with ${escapeHtml(storeName)}! 💚</p>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${escapeHtml(storeName)}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">${title}</p>
  </div>
  <div style="padding:24px;">
    ${greeting}
    <div style="background:#f8fafb;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#555;text-transform:uppercase;">Customer Details</h3>
      <p style="margin:4px 0;font-size:14px;"><strong>${escapeHtml(order.customer_name)}</strong></p>
      <p style="margin:4px 0;font-size:14px;">📞 ${escapeHtml(order.customer_phone)}</p>
      ${order.customer_email ? `<p style="margin:4px 0;font-size:14px;">✉️ ${escapeHtml(order.customer_email)}</p>` : ''}
      <p style="margin:4px 0;font-size:14px;">📍 ${escapeHtml(order.customer_address)}, ${escapeHtml(order.customer_city)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f0fdf4;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#666;text-transform:uppercase;">Product</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#666;text-transform:uppercase;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;text-transform:uppercase;">Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#666;text-transform:uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div style="border-top:2px solid #e5e7eb;padding-top:12px;margin-top:8px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;">
        <span style="color:#666;">Subtotal</span>
        <span>৳${subtotal.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;">
        <span style="color:#666;">Delivery</span>
        <span>${deliveryCharge <= 0 ? '<span style="color:#10b981;">Free</span>' : `৳${deliveryCharge.toLocaleString()}`}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:18px;font-weight:bold;border-top:1px solid #e5e7eb;margin-top:8px;">
        <span>Total</span>
        <span style="color:#10b981;">৳${total.toLocaleString()}</span>
      </div>
    </div>
    <div style="background:#fffbeb;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px;">
      <strong>Payment:</strong> ${paymentLabel} | <strong>Status:</strong> Pending
    </div>
    ${order.notes ? `<div style="background:#f0f9ff;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px;"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>` : ''}
    ${footer}
  </div>
  <div style="background:#f8fafb;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} ${escapeHtml(storeName)}. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { orderId } = await req.json();

    if (!orderId || typeof orderId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Missing orderId' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid orderId' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Fetch order from database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ success: false, error: 'Order not found' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // SECURITY: Only allow sending emails for orders created within the last 10 minutes
    const orderCreatedAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;
    if (now - orderCreatedAt > tenMinutesMs) {
      return new Response(JSON.stringify({ success: false, error: 'Order too old for email notification' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('product_name_bn, product_name_en, quantity, price')
      .eq('order_id', orderId);

    if (itemsError || !orderItems) {
      console.error('Order items not found:', itemsError);
      return new Response(JSON.stringify({ success: false, error: 'Order items not found' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Fetch store settings
    const { data: settingsData } = await supabaseAdmin
      .from('store_settings')
      .select('key, value')
      .in('key', ['store_email', 'store_name', 'store_phone']);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { key: string; value: string | null }) => {
      settings[s.key] = s.value || '';
    });

    const storeEmail = settings.store_email;
    const storeName = settings.store_name || 'ShopLandBD';
    const storePhone = settings.store_phone || '';

    const emailPromises: Promise<Response>[] = [];

    // 1. Send admin notification
    if (storeEmail) {
      const adminHtml = generateOrderEmailHtml(order, orderItems, storeName, storePhone, true);
      emailPromises.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${storeName} <onboarding@resend.dev>`,
            to: [storeEmail],
            subject: `🛒 New Order #${orderId.slice(0, 8).toUpperCase()} - ${order.customer_name}`,
            html: adminHtml,
          }),
        })
      );
    }

    // 2. Send customer confirmation
    if (order.customer_email) {
      const customerHtml = generateOrderEmailHtml(order, orderItems, storeName, storePhone, false);
      emailPromises.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${storeName} <onboarding@resend.dev>`,
            to: [order.customer_email],
            subject: `✅ Order Confirmed #${orderId.slice(0, 8).toUpperCase()} - ${storeName}`,
            html: customerHtml,
          }),
        })
      );
    }

    if (emailPromises.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Email send failed:', result.reason);
      } else if (result.status === 'fulfilled') {
        const res = result.value;
        if (!res.ok) {
          const errBody = await res.text();
          console.error('Resend API error:', res.status, errBody);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Email function error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Email sending failed' }), {
      status: 200,
      headers: corsHeaders,
    });
  }
});
