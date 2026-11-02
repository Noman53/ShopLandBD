import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isAllowedOrigin } from "../_shared/cors.ts";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_MESSAGES = 30;
const MAX_CONTEXT_LENGTH = 24000;
const MAX_CHAT_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const CHAT_ATTACHMENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const ORDER_ID_PATTERN = /\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/i;
const SHORT_ORDER_ID_PATTERN = /(?:#|order(?:\s*(?:id|number|no\.?))?|অর্ডার(?:\s*(?:আইডি|নম্বর|নং))?)\s*#?([0-9a-f]{8})\b/i;
const BD_PHONE_PATTERN = /(?:\+?880[\s-]?1[3-9](?:[\s-]?\d){8}|01[3-9](?:[\s-]?\d){8})/;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hashGuestToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashRateLimitKey(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createGuestToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CONTEXT_MESSAGES) {
    return false;
  }

  let totalLength = 0;
  for (const message of value) {
    if (
      !message ||
      typeof message !== "object" ||
      !("role" in message) ||
      !("content" in message) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) {
      return false;
    }

    totalLength += message.content.length;
  }

  return totalLength <= MAX_CONTEXT_LENGTH && value[value.length - 1].role === "user";
}

function extractOrderReference(content: string, allowBareShortId = false) {
  const fullId = content.match(ORDER_ID_PATTERN)?.[0];
  if (fullId) return fullId.toLowerCase();
  const labeledId = content.match(SHORT_ORDER_ID_PATTERN)?.[1];
  if (labeledId) return labeledId.toLowerCase();
  if (!allowBareShortId) return null;
  return content.match(/(?:^|[^0-9a-f])#?([0-9a-f]{8})(?=$|[^0-9a-f])/i)?.[1]?.toLowerCase() ?? null;
}

function extractPhone(content: string) {
  const match = content.match(BD_PHONE_PATTERN)?.[0];
  if (!match) return null;
  const digits = match.replace(/\D/g, "");
  const phone = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  return /^01[3-9]\d{8}$/.test(phone) ? phone : null;
}

function hasAny(message: string, phrases: string[]) {
  return phrases.some((phrase) => message.includes(phrase));
}

async function buildSupportReply(
  supabase: ReturnType<typeof createClient>,
  messages: ChatMessage[],
  enforceRateLimit: (scope: string, limit: number) => Promise<boolean>,
  corsHeaders: Record<string, string>,
): Promise<string | Response> {
  const latest = messages[messages.length - 1].content.trim();
  const normalized = latest.toLowerCase();
  const isBangla = /[\u0980-\u09ff]/.test(latest);
  const previousAssistant = [...messages.slice(0, -1)].reverse()
    .find((message) => message.role === "assistant")?.content.toLowerCase() ?? "";
  const isAwaitingOrderDetails = (
    (
      previousAssistant.includes("order id") &&
      (
        previousAssistant.includes("phone") ||
        previousAssistant.includes("first 8 characters") ||
        previousAssistant.includes("8-character order id")
      )
    ) ||
    (
      previousAssistant.includes("অর্ডার আইডি") &&
      (
        previousAssistant.includes("ফোন") ||
        previousAssistant.includes("প্রথম ৮ অক্ষর") ||
        previousAssistant.includes("৮ অক্ষরের অর্ডার আইডি")
      )
    ) ||
    previousAssistant.includes("phone number used at checkout") ||
    previousAssistant.includes("ফোন নম্বরটি পাঠান")
  );
  const wantsOrderTracking = hasAny(normalized, [
    "track my order", "track order", "order status", "where is my order",
    "অর্ডার ট্র্যাক", "অর্ডারের অবস্থা", "অর্ডার কোথায়", "অর্ডার কোথায়",
  ]);
  const recentCustomerMessages = messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content);
  const orderReference = extractOrderReference(latest, isAwaitingOrderDetails || wantsOrderTracking) ??
    (isAwaitingOrderDetails
      ? recentCustomerMessages.map((message) => extractOrderReference(message, true)).find(Boolean) ?? null
      : null);
  const phone = extractPhone(latest) ??
    (isAwaitingOrderDetails ? recentCustomerMessages.map(extractPhone).find(Boolean) ?? null : null);

  if (wantsOrderTracking || isAwaitingOrderDetails || orderReference) {
    if (!orderReference && !phone) {
      return isBangla
        ? "আপনার অর্ডারের অবস্থা জানতে ৮ অক্ষরের অর্ডার আইডিটি লিখুন (যেমন `A1B2C3D4`)।"
        : "To track your order, enter your 8-character Order ID (for example, `A1B2C3D4`).";
    }
    if (!orderReference) {
      return isBangla
        ? "অর্ডার আইডির প্রথম ৮ অক্ষরটিও পাঠান, যেমন `A1B2C3D4`।"
        : "Please also send the first 8 characters of the order ID, such as `A1B2C3D4`.";
    }
    if (!phone) {
      return isBangla
        ? "নিরাপত্তার জন্য অর্ডার করার সময় ব্যবহৃত ১১ সংখ্যার ফোন নম্বরটি পাঠান।"
        : "For security, please send the 11-digit phone number used at checkout.";
    }
    if (!await enforceRateLimit("order_lookup", 5)) {
      return jsonResponse({ error: "Too many order lookups. Please try again shortly." }, 429, corsHeaders);
    }

    const { data: order, error } = await supabase.rpc("track_order_chat", {
      p_order_reference: orderReference,
      p_phone: phone,
    });
    if (error) {
      console.error("Could not look up an order from support chat:", error.message);
      throw new Error("Order lookup is unavailable");
    }
    if (!order) {
      return isBangla
        ? "এই আইডি ও ফোন নম্বরের সঙ্গে কোনো অর্ডার মেলেনি। তথ্য যাচাই করে আবার পাঠান, অথবা [অর্ডার ট্র্যাকিং পেজ](/track-order) ব্যবহার করুন।"
        : "We couldn't match that order ID and phone number. Check the details or use the [order tracking page](/track-order).";
    }

    const statusLabels: Record<string, { bn: string; en: string }> = {
      pending: { bn: "অপেক্ষমাণ", en: "Pending" },
      confirmed: { bn: "নিশ্চিত", en: "Confirmed" },
      shipped: { bn: "পাঠানো হয়েছে", en: "Shipped" },
      delivered: { bn: "ডেলিভার হয়েছে", en: "Delivered" },
      cancelled: { bn: "বাতিল", en: "Cancelled" },
    };
    const paymentLabels: Record<string, { bn: string; en: string }> = {
      pending: { bn: "অপেক্ষমাণ", en: "Pending" },
      verified: { bn: "যাচাইকৃত", en: "Verified" },
      paid: { bn: "পরিশোধিত", en: "Paid" },
      failed: { bn: "ব্যর্থ", en: "Failed" },
    };
    const status = statusLabels[order.order_status]?.[isBangla ? "bn" : "en"] ?? order.order_status;
    const payment = paymentLabels[order.payment_status]?.[isBangla ? "bn" : "en"] ?? order.payment_status;
    return isBangla
      ? `আপনার অর্ডারের বর্তমান অবস্থা: **${status}**। পেমেন্ট: **${payment}**। বিস্তারিত দেখতে [অর্ডার ট্র্যাকিং পেজ](/track-order) দেখুন।`
      : `Your order status is **${status}**. Payment: **${payment}**. View the [order tracking page](/track-order) for details.`;
  }

  if (hasAny(normalized, ["delivery charge", "delivery fee", "shipping fee", "shipping cost", "ডেলিভারি চার্জ", "ডেলিভারি খরচ", "ডেলিভারি ফি"])) {
    const { data: settings, error } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", ["delivery_charge_dhaka", "delivery_charge_outside_dhaka"]);
    if (error) {
      console.error("Could not load delivery charges for support:", error.message);
      return isBangla
        ? "ডেলিভারি চার্জ এখন দেখা যাচ্ছে না। চেকআউটে আপনার ঠিকানা দিলে সঠিক চার্জ দেখতে পারবেন।"
        : "Delivery charges are temporarily unavailable. The exact charge will appear at checkout after you enter your address.";
    }
    const charges = Object.fromEntries((settings ?? []).map(({ key, value }) => [key, value]));
    const dhaka = charges.delivery_charge_dhaka;
    const outside = charges.delivery_charge_outside_dhaka;
    if (dhaka && outside) {
      return isBangla
        ? `ডেলিভারি চার্জ: ঢাকার মধ্যে ৳${dhaka}, ঢাকার বাইরে ৳${outside}।`
        : `Delivery charges: ৳${dhaka} inside Dhaka and ৳${outside} outside Dhaka.`;
    }
    return isBangla
      ? "সঠিক ডেলিভারি চার্জ চেকআউটে ঠিকানা দেওয়ার পর দেখা যাবে।"
      : "The exact delivery charge is shown at checkout after you enter your address.";
  }

  if (hasAny(normalized, ["delivery time", "how long", "when will", "কতদিন", "কত দিন", "কখন পাব", "ডেলিভারি সময়", "ডেলিভারি সময়"])) {
    return isBangla
      ? "এলাকা ও কুরিয়ার অনুযায়ী ডেলিভারির সময় ভিন্ন হতে পারে। অর্ডার করার পর অর্ডার আইডি ও ফোন নম্বর দিয়ে [অর্ডার ট্র্যাকিং পেজে](/track-order) সর্বশেষ অবস্থা দেখুন।"
      : "Delivery time depends on your location and courier. After ordering, check the latest updates on the [order tracking page](/track-order).";
  }

  if (hasAny(normalized, ["payment", "pay", "bkash", "cash on delivery", "cod", "পেমেন্ট", "বিকাশ", "ক্যাশ অন ডেলিভারি"])) {
    return isBangla
      ? "আপনি ক্যাশ অন ডেলিভারি অথবা বিকাশে পেমেন্ট করতে পারবেন। উপলভ্য পদ্ধতি চেকআউটে দেখানো হবে।"
      : "You can pay with Cash on Delivery or bKash. Available options are shown at checkout.";
  }

  if (hasAny(normalized, ["return", "refund", "exchange", "রিটার্ন", "ফেরত", "রিফান্ড", "বদল"])) {
    return isBangla
      ? "ডেলিভারির ৭ দিনের মধ্যে রিটার্নের অনুরোধ করা যায়। শর্ত ও প্রক্রিয়া জানতে [রিটার্ন পলিসি](/returns) দেখুন।"
      : "Return requests can be made within 7 days of delivery. See the [returns policy](/returns) for eligibility and instructions.";
  }

  if (hasAny(normalized, ["offer", "discount", "sale", "অফার", "ছাড়", "ডিসকাউন্ট"])) {
    return isBangla
      ? "চলমান অফার ও ছাড় দেখতে [পণ্যসমূহ](/products) এবং হোমপেজের অফার সেকশন দেখুন।"
      : "Browse [products](/products) and the homepage offer section for current deals.";
  }

  if (hasAny(normalized, ["product", "stock", "available", "size", "color", "colour", "পণ্য", "স্টক", "সাইজ", "রং"])) {
    return isBangla
      ? "পণ্যের বর্তমান দাম, স্টক, সাইজ ও রং পণ্যের পেজে দেখুন: [পণ্যসমূহ](/products)।"
      : "Current prices, stock, sizes, and colours are listed on each product page: [browse products](/products).";
  }

  if (hasAny(normalized, ["hello", "hi", "hey", "assalamu", "আসসালামু", "হ্যালো", "হাই", "সালাম"])) {
    return isBangla
      ? "স্বাগতম! অর্ডার ট্র্যাকিং, ডেলিভারি, পেমেন্ট বা রিটার্ন সম্পর্কে কী জানতে চান?"
      : "Welcome! What can I help with—order tracking, delivery, payments, or returns?";
  }

  return isBangla
    ? "আমি অর্ডার ট্র্যাকিং, ডেলিভারি, পেমেন্ট ও রিটার্নে সাহায্য করতে পারি। দরকার হলে একজন সহায়তাকারীর সঙ্গে কথা বলতে নিচের বাটন চাপুন।"
    : "I can help with order tracking, delivery, payments, and returns. For anything else, use the button below to contact a support agent.";
}

async function handleRequest(req: Request) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origin is not allowed" }, 403, corsHeaders);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 32000) {
      return jsonResponse({ error: "Request is too large" }, 413, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Chat service is missing Supabase configuration");
      return jsonResponse({ error: "Chat service is not configured" }, 500, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse({ error: "Invalid request body" }, 400, corsHeaders);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400, corsHeaders);
    }

    const action = body.action;
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const guestToken = typeof body.guestToken === "string" ? body.guestToken : "";
    const forwardedIp = req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";
    const windowStartedAt = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    const enforceRateLimit = async (scope: string, limit: number) => {
      const requestKey = await hashRateLimitKey(`${forwardedIp}:${scope}`, serviceRoleKey);
      const { data, error } = await supabase.rpc("increment_chat_request_limit", {
        p_request_key: requestKey,
        p_window_started_at: windowStartedAt,
        p_limit: limit,
      });
      if (error) {
        console.error("Could not check chat rate limit:", error.message);
        throw new Error("Chat rate limit service is unavailable");
      }
      return typeof data === "number" && data <= limit;
    };

    if (!await enforceRateLimit("general", 30)) {
      return jsonResponse({ error: "Too many chat requests. Please try again shortly." }, 429, corsHeaders);
    }
    if (action === "generateReply" && !await enforceRateLimit("generation", 8)) {
      return jsonResponse({ error: "Chat reply limit reached. Please try again shortly." }, 429, corsHeaders);
    }

    if (action === "createGuestConversation") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (!name || name.length > 150 || !phone || phone.length > 30) {
        return jsonResponse({ error: "A valid name and phone number are required" }, 400, corsHeaders);
      }

      const accessToken = createGuestToken();
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          guest_name: name,
          guest_phone: phone,
          status: "ai",
          guest_access_token_hash: await hashGuestToken(accessToken),
        })
        .select("id")
        .single();
      if (error) {
        console.error("Failed to create guest conversation:", error.message);
        return jsonResponse({ error: "Could not start chat" }, 500, corsHeaders);
      }
      return jsonResponse({ conversationId: data.id, guestToken: accessToken }, 201, corsHeaders);
    }

    const authorization = req.headers.get("authorization") || "";
    const bearerToken = req.headers.get("x-session-token") || authorization.replace(/^Bearer\s+/i, "");
    const authenticatedUser = bearerToken && bearerToken !== anonKey
      ? await supabase.auth.getUser(bearerToken)
      : null;
    if (authenticatedUser?.error && !guestToken) {
      return jsonResponse({ error: "Invalid authentication" }, 401, corsHeaders);
    }
    const user = authenticatedUser?.data?.user ?? null;

    let conversationQuery = supabase
      .from("chat_conversations")
      .select("id, user_id, status, guest_access_token_hash")
      .eq("id", conversationId);

    if (guestToken) {
      conversationQuery = conversationQuery.eq("guest_access_token_hash", await hashGuestToken(guestToken));
    } else if (user) {
      conversationQuery = conversationQuery.eq("user_id", user.id);
    } else {
      return jsonResponse({ error: "Chat access is required" }, 401, corsHeaders);
    }

    if (!conversationId) {
      return jsonResponse({ error: "A conversation ID is required" }, 400, corsHeaders);
    }
    const { data: conversation, error: conversationError } = await conversationQuery.maybeSingle();
    if (conversationError) {
      console.error("Failed to verify chat access:", conversationError.message);
      return jsonResponse({ error: "Could not verify chat access" }, 500, corsHeaders);
    }
    if (!conversation) {
      return jsonResponse({ error: "Conversation not found" }, 404, corsHeaders);
    }

    if (action === "claimGuestConversation") {
      if (!user || !guestToken || conversation.user_id !== null) {
        return jsonResponse({ error: "Conversation cannot be claimed" }, 403, corsHeaders);
      }
      const { error } = await supabase
        .from("chat_conversations")
        .update({ user_id: user.id, guest_access_token_hash: null })
        .eq("id", conversationId)
        .is("user_id", null);
      if (error) {
        console.error("Failed to claim guest conversation:", error.message);
        return jsonResponse({ error: "Could not link conversation to account" }, 500, corsHeaders);
      }
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    if (guestToken && conversation.user_id !== null) {
      return jsonResponse({ error: "Guest access has expired" }, 403, corsHeaders);
    }

    if (action === "createChatAttachmentUpload") {
      if (!["ai", "live", "waiting_reply"].includes(conversation.status)) {
        return jsonResponse({ error: "This conversation is closed" }, 409, corsHeaders);
      }
      if (!await enforceRateLimit("attachment_upload", 5)) {
        return jsonResponse({ error: "Too many attachment uploads. Please try again shortly." }, 429, corsHeaders);
      }

      const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
      const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
      const extension = CHAT_ATTACHMENT_TYPES[contentType];
      if (!extension || fileSize <= 0 || fileSize > MAX_CHAT_ATTACHMENT_SIZE) {
        return jsonResponse({ error: "Unsupported file type or size. Use an image or document up to 10 MB." }, 400, corsHeaders);
      }

      const path = `${conversationId}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .createSignedUploadUrl(path, { upsert: false });
      if (error || !data?.token) {
        console.error("Could not create a chat attachment upload URL:", error?.message);
        return jsonResponse({ error: "Could not prepare the attachment upload" }, 500, corsHeaders);
      }
      return jsonResponse({ path, token: data.token, contentType }, 200, corsHeaders);
    }

    if (action === "getChatAttachmentUrl") {
      const path = typeof body.path === "string" ? body.path : "";
      if (
        !path.startsWith(`${conversationId}/`) ||
        path.split("/").length !== 2 ||
        !/^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(path.split("/")[1])
      ) {
        return jsonResponse({ error: "Invalid attachment path" }, 400, corsHeaders);
      }
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 10 * 60);
      if (error || !data?.signedUrl) {
        console.error("Could not create a chat attachment download URL:", error?.message);
        return jsonResponse({ error: "Could not open the attachment" }, 404, corsHeaders);
      }
      return jsonResponse({ url: data.signedUrl }, 200, corsHeaders);
    }

    if (action === "getGuestMessages") {
      const [{ data: messages, error: messagesError }, { data: latestConversation, error: statusError }] =
        await Promise.all([
          supabase
            .from("chat_messages")
            .select("id, sender_type, content, created_at, is_read")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(200),
          supabase
            .from("chat_conversations")
            .select("status")
            .eq("id", conversationId)
            .single(),
        ]);
      if (messagesError || statusError) {
        console.error("Failed to load chat history:", messagesError?.message || statusError?.message);
        return jsonResponse({ error: "Could not load chat history" }, 500, corsHeaders);
      }
      return jsonResponse({ messages, status: latestConversation.status }, 200, corsHeaders);
    }

    if (action === "sendGuestMessage") {
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!guestToken || !content || content.length > MAX_MESSAGE_LENGTH) {
        return jsonResponse({ error: "Message must be between 1 and 4000 characters" }, 400, corsHeaders);
      }
      if (!["ai", "live", "waiting_reply"].includes(conversation.status)) {
        return jsonResponse({ error: "This conversation is closed" }, 409, corsHeaders);
      }
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "customer",
        content,
      });
      if (error) {
        console.error("Failed to save guest message:", error.message);
        return jsonResponse({ error: "Could not send message" }, 500, corsHeaders);
      }
      return jsonResponse({ success: true }, 201, corsHeaders);
    }

    if (action === "setGuestStatus") {
      const status = body.status;
      if (!guestToken || (status !== "live" && status !== "waiting_reply")) {
        return jsonResponse({ error: "Invalid conversation status" }, 400, corsHeaders);
      }
      const { error } = await supabase
        .from("chat_conversations")
        .update({ status })
        .eq("id", conversationId);
      if (error) {
        console.error("Failed to update guest conversation:", error.message);
        return jsonResponse({ error: "Could not update conversation" }, 500, corsHeaders);
      }
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    if (action === "markGuestMessagesRead") {
      const ids = body.messageIds;
      if (!guestToken || !Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string")) {
        return jsonResponse({ error: "Invalid message list" }, 400, corsHeaders);
      }
      if (ids.length > 0) {
        const { error } = await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_type", "customer")
          .in("id", ids);
        if (error) {
          console.error("Failed to mark guest messages read:", error.message);
          return jsonResponse({ error: "Could not update message status" }, 500, corsHeaders);
        }
      }
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    if (action !== "generateReply") {
      return jsonResponse({ error: "Unsupported chat action" }, 400, corsHeaders);
    }
    if (conversation.status !== "ai") {
      return jsonResponse({ error: "Automated replies are unavailable for this conversation" }, 409, corsHeaders);
    }

    const { data: storedMessages, error: historyError } = await supabase
      .from("chat_messages")
      .select("sender_type, content")
      .eq("conversation_id", conversationId)
      .in("sender_type", ["customer", "ai", "admin"])
      .order("created_at", { ascending: false })
      .limit(MAX_CONTEXT_MESSAGES);
    if (historyError) {
      console.error("Failed to load chat context:", historyError.message);
      return jsonResponse({ error: "Could not load conversation" }, 500, corsHeaders);
    }

    const messages = (storedMessages ?? [])
      .reverse()
      .map((message) => ({
        role: message.sender_type === "customer" ? "user" as const : "assistant" as const,
        content: message.content,
      }));
    if (!validateMessages(messages)) {
      return jsonResponse({ error: "No valid customer message was found" }, 400, corsHeaders);
    }

    const reply = await buildSupportReply(supabase, messages, enforceRateLimit, corsHeaders);
    if (reply instanceof Response) return reply;

    const { error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      content: reply,
    });
    if (insertError) {
      console.error("Failed to save support reply:", insertError.message);
      return jsonResponse({ error: "Could not save support reply" }, 500, corsHeaders);
    }

    if (body.stream === true) {
      const event = `data: ${JSON.stringify({ choices: [{ delta: { content: reply } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(event, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    return jsonResponse({ reply }, 200, corsHeaders);
  } catch (error) {
    console.error("Chat function error:", error);
    return jsonResponse({ error: "Chat service encountered an error" }, 500, getCorsHeaders(req.headers.get("origin")));
  }
}

serve(handleRequest);
