import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Headphones, Loader2, Clock, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ChatMessageComponent from '@/components/chat/ChatMessage';
import TypingIndicator from '@/components/chat/TypingIndicator';
import QuickReplies from '@/components/chat/QuickReplies';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { isValidBDPhone, normalizeBDPhone } from '@/lib/validation';

export interface ChatMessage {
  id: string;
  sender_type: 'customer' | 'ai' | 'admin';
  content: string;
  created_at: string;
  is_read: boolean;
}

interface UserProfile {
  name: string | null;
  phone: string | null;
}

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const ADMIN_WAIT_TIMEOUT = 2 * 60 * 1000;
const SESSION_STORAGE_KEY = 'shoplandbd_chat_session';

export default function ChatWidget() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestAccessToken, setGuestAccessToken] = useState<string | null>(null);
  const guestAccessTokenRef = useRef<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'ai' | 'live' | 'waiting_reply' | 'closed'>('ai');
  
  // Contact details for human handover or order lookup
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminTyping, setAdminTyping] = useState(false);
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);
  const [adminWaitSeconds, setAdminWaitSeconds] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const justFinishedStreamingRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adminRespondedRef = useRef(false);

  // Load profile for authenticated users
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setUserProfile({ name: data.name, phone: data.phone });
            if (data.name) setGuestName(data.name);
            if (data.phone) setGuestPhone(data.phone);
          }
        });
    }
  }, [user]);

  // Restore chat session from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.conversationId) {
          setConversationId(parsed.conversationId);
          setConversationStatus(parsed.conversationStatus || 'ai');
          if (parsed.guestAccessToken) {
            setGuestAccessToken(parsed.guestAccessToken);
            guestAccessTokenRef.current = parsed.guestAccessToken;
          }
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setMessages(parsed.messages);
          }
          if (parsed.guestName) setGuestName(parsed.guestName);
          if (parsed.guestPhone) setGuestPhone(parsed.guestPhone);
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, []);

  // Save chat session to sessionStorage
  useEffect(() => {
    if (conversationId || messages.length > 0) {
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            conversationId,
            guestAccessToken,
            conversationStatus,
            messages: messages.slice(-50),
            guestName,
            guestPhone,
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [conversationId, guestAccessToken, conversationStatus, messages, guestName, guestPhone]);

  // Notification sound
  useEffect(() => {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZSQi4eCfXx9goiNkJGQjoqGg4B+foCDh4qMjY2MioiGhIKBgIGChIaIiouLi4qJiIaFhIOCgoKDhIWGh4iIiIiHhoaFhISEhIODhISFhoaHh4eHh4eGhoWFhYWFhYWFhoaGhoaGhoaGhoaFhYWFhYWFhYWFhYaGhoaGhoaGhoaGhYWFhYWFhYWFhYWFhYWF'
    );
    audio.volume = 0.4;
    audioRef.current = audio;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    guestAccessTokenRef.current = null;
    setGuestAccessToken(null);
    setConversationStatus('ai');
    setShowContactForm(false);
    setUnreadCount(0);
    setIsStreaming(false);
    setIsLoading(false);
    setWaitingForAdmin(false);
    setAdminWaitSeconds(0);
    setAdminTyping(false);
    adminRespondedRef.current = false;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
    if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
    setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom();
    }, 200);
  }, [scrollToBottom]);

  // Inactivity auto-cleanup
  useEffect(() => {
    if (messages.length === 0) return;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (conversationStatus === 'closed') resetChat();
    }, INACTIVITY_TIMEOUT);
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [messages, conversationStatus, resetChat]);

  // Realtime subscription for messages when connected to Supabase
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-channel-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Partial<ChatMessage>;
          if (!newMsg.id || !newMsg.sender_type || typeof newMsg.content !== 'string') return;
          if (newMsg.sender_type === 'customer') return;
          if (newMsg.sender_type === 'ai' && (isStreaming || justFinishedStreamingRef.current)) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || m.content === newMsg.content)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id as string,
                sender_type: newMsg.sender_type as 'ai' | 'admin',
                content: newMsg.content as string,
                created_at: (newMsg.created_at as string) || new Date().toISOString(),
                is_read: true,
              },
            ];
          });

          if (!isOpen) setUnreadCount((prev) => prev + 1);
          audioRef.current?.play().catch(() => {});

          if (newMsg.sender_type === 'admin') {
            adminRespondedRef.current = true;
            setAdminTyping(false);
            setWaitingForAdmin(false);
            setAdminWaitSeconds(0);
            if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
            if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
            setConversationStatus('live');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen, isStreaming]);

  // Realtime subscription for admin typing status
  useEffect(() => {
    if (!conversationId || (conversationStatus !== 'live' && !waitingForAdmin)) return;
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: user?.id || 'visitor' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isTyping = Object.values(state).some((presences) =>
          presences.some((presence) => {
            const details = presence as { role?: string; typing?: boolean };
            return details.role === 'admin' && details.typing === true;
          })
        );
        setAdminTyping(isTyping);
        if (isTyping && waitingForAdmin) {
          adminRespondedRef.current = true;
          setWaitingForAdmin(false);
          setConversationStatus('live');
          setAdminWaitSeconds(0);
          if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
          if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, conversationStatus, user?.id, waitingForAdmin]);

  // Client-side instant assistant intelligence with comprehensive knowledge base
  const generateInstantReply = async (userQuery: string): Promise<string> => {
    const q = userQuery.toLowerCase().trim();
    const isBn = language === 'bn' || /[\u0980-\u09ff]/.test(userQuery);

    // 1. Order tracking detection (matches 8-char hex or UUID)
    const orderMatch = userQuery.match(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\b/i);
    const phoneMatch = userQuery.match(/(?:\+?880[\s-]?1[3-9](?:[\s-]?\d){8}|01[3-9](?:[\s-]?\d){8})/);
    const previousAssistant = [...messages].reverse()
      .find((message) => message.sender_type === 'ai')?.content.toLowerCase() ?? '';
    const isAwaitingOrderDetails =
      (previousAssistant.includes('order id') &&
        (previousAssistant.includes('phone') || previousAssistant.includes('8-character order id'))) ||
      (previousAssistant.includes('অর্ডার আইডি') &&
        (previousAssistant.includes('ফোন') || previousAssistant.includes('৮ অক্ষরের অর্ডার আইডি')));
    const orderReference = orderMatch?.[0] ?? (isAwaitingOrderDetails
      ? [...messages].reverse()
        .filter((message) => message.sender_type === 'customer')
        .map((message) => message.content.match(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\b/i)?.[0])
        .find(Boolean)
      : undefined);

    const wantsOrder =
      q.includes('track') ||
      q.includes('order status') ||
      q.includes('where is my order') ||
      q.includes('ট্র্যাক') ||
      q.includes('অর্ডার কোথায়') ||
      q.includes('অর্ডারের অবস্থা') ||
      q.includes('অর্ডার চেক');

    if (wantsOrder || (orderReference && phoneMatch) || (isAwaitingOrderDetails && orderReference)) {
      if (orderReference && phoneMatch) {
        const orderIdClean = orderReference.toLowerCase();
        let phoneClean = phoneMatch[0].replace(/\D/g, '');
        if (phoneClean.startsWith('880')) phoneClean = '0' + phoneClean.slice(3);

        try {
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('id, order_status, payment_status, total, created_at, customer_name')
            .ilike('id', `${orderIdClean}%`)
            .eq('customer_phone', phoneClean)
            .limit(1);

          if (!ordersError && ordersData && ordersData.length > 0) {
            const ord = ordersData[0];
            const statusMap: Record<string, { bn: string; en: string }> = {
              pending: { bn: 'পেন্ডিং (অপেক্ষমাণ)', en: 'Pending' },
              confirmed: { bn: 'কনফার্মড (নিশ্চিত)', en: 'Confirmed' },
              shipped: { bn: 'শিপড (ডেলিভারির পথে)', en: 'Shipped' },
              delivered: { bn: 'ডেলিভার্ড (সম্পন্ন)', en: 'Delivered' },
              cancelled: { bn: 'বাতিলকৃত', en: 'Cancelled' },
            };
            const payMap: Record<string, { bn: string; en: string }> = {
              pending: { bn: 'পেন্ডিং', en: 'Pending' },
              verified: { bn: 'যাচাইকৃত', en: 'Verified' },
              paid: { bn: 'পরিশোধিত', en: 'Paid' },
              failed: { bn: 'ব্যর্থ', en: 'Failed' },
            };
            const sText = statusMap[ord.order_status]?.[isBn ? 'bn' : 'en'] || ord.order_status;
            const pText = payMap[ord.payment_status]?.[isBn ? 'bn' : 'en'] || ord.payment_status;

            return isBn
              ? `📦 **অর্ডার ট্র্যাকিং তথ্য:**\n\n• **অর্ডার আইডি:** \`#${ord.id.slice(0, 8).toUpperCase()}\`\n• **বর্তমান অবস্থা:** **${sText}**\n• **পেমেন্ট অবস্থা:** **${pText}**\n• **মোট পরিমাণ:** ৳${ord.total}\n\nবিস্তারিত আপডেট দেখতে [অর্ডার ট্র্যাকিং পেজ](/track-order) দেখুন।`
              : `📦 **Order Status Details:**\n\n• **Order ID:** \`#${ord.id.slice(0, 8).toUpperCase()}\`\n• **Current Status:** **${sText}**\n• **Payment:** **${pText}**\n• **Total:** ৳${ord.total}\n\nFor more details, visit the [Order Tracking page](/track-order).`;
          }
        } catch {
          // Continue to fallback message
        }

        return isBn
          ? `এই অর্ডার আইডি ও ফোন নম্বরের সাথে কোনো অর্ডার রেকর্ড মেলেনি। অনুগ্রহ করে আইডি ও ফোন নম্বর সঠিক আছে কিনা যাচাই করুন, অথবা সরাসরি [অর্ডার ট্র্যাকিং পেজে](/track-order) সার্চ করুন।`
          : `We couldn't match that order ID and phone number. Please double check the details or visit the [Order Tracking page](/track-order).`;
      }

      if (orderReference && !phoneMatch) {
        return isBn
          ? `অর্ডারটি যাচাই করতে অর্ডার করার সময় ব্যবহৃত ফোন নম্বরটি লিখুন।`
          : `To verify your order, please enter the phone number used at checkout.`;
      }

      return isBn
        ? `আপনার অর্ডারের অবস্থা জানতে অনুগ্রহ করে **৮ অক্ষরের অর্ডার আইডিটি** লিখুন (যেমন: \`A1B2C3D4\`)। অথবা সরাসরি [অর্ডার ট্র্যাকিং পেজ](/track-order) দেখুন।`
        : `To track your order, please enter your **8-character Order ID** (e.g. \`A1B2C3D4\`), or visit the [Order Tracking page](/track-order).`;
    }

    // 2. Delivery charge / shipping fee
    if (
      q.includes('delivery charge') ||
      q.includes('delivery fee') ||
      q.includes('shipping') ||
      q.includes('ডেলিভারি চার্জ') ||
      q.includes('ডেলিভারি খরচ') ||
      q.includes('ডেলিভারি ফি') ||
      q.includes('চার্জ কত')
    ) {
      return isBn
        ? `🚚 **ডেলিভারি চার্জের তথ্য:**\n\n• **ঢাকার ভিতরে:** ৳৬০ - ৳৭০\n• **ঢাকার বাইরে (সারাদেশে):** ৳১২০\n\nনির্দিষ্ট কিছু পণ্য বা অফারের ক্ষেত্রে **ফ্রি ডেলিভারি** সুবিধা উপভোগ করতে পারেন! চেকআউটে আপনার ঠিকানা নির্বাচন করলেই সঠিক চার্জটি দেখতে পাবেন।`
        : `🚚 **Delivery Charge Details:**\n\n• **Inside Dhaka:** ৳60 - ৳70\n• **Outside Dhaka (Nationwide):** ৳120\n\nFree delivery is available on selected promotional orders. The exact charge is automatically calculated at checkout after selecting your division.`;
    }

    // 3. Delivery timeframe
    if (
      q.includes('delivery time') ||
      q.includes('how long') ||
      q.includes('কখন পাব') ||
      q.includes('কতদিন') ||
      q.includes('কত দিন') ||
      q.includes('সময় লাগবে')
    ) {
      return isBn
        ? `⏱️ **ডেলিভারির সময়সীমা:**\n\n• **ঢাকার ভিতরে:** সাধারণত **২৪ থেকে ৪৮ ঘণ্টার** মধ্যে ডেলিভারি সম্পন্ন হয়।\n• **ঢাকার বাইরে:** সাধারণত **২ থেকে ৪ কার্যদিবসের** মধ্যে হোম ডেলিভারি পৌঁছে দেওয়া হয়।`
        : `⏱️ **Delivery Timeframe:**\n\n• **Inside Dhaka:** Usually delivered within **24 - 48 hours**.\n• **Outside Dhaka:** Delivered nationwide within **2 - 4 business days**.`;
    }

    // 4. Payment methods
    if (
      q.includes('payment') ||
      q.includes('bkash') ||
      q.includes('cash on delivery') ||
      q.includes('cod') ||
      q.includes('পেমেন্ট') ||
      q.includes('বিকাশ') ||
      q.includes('ক্যাশ অন')
    ) {
      return isBn
        ? `💳 **পেমেন্ট পদ্ধতিসমূহ:**\n\n১. **ক্যাশ অন ডেলিভারি (Cash on Delivery):** পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধ করার সুযোগ।\n২. **বিকাশ (bKash):** আমাদের বিকাশ মার্চেন্ট নাম্বারে সেন্ড মানি বা পেমেন্ট করে ট্রানজেকশন আইডি দিয়ে চেকআউট করতে পারবেন।`
        : `💳 **Available Payment Methods:**\n\n1. **Cash on Delivery (COD):** Pay with cash upon receiving your order.\n2. **bKash Payment:** Pay seamlessly via bKash and provide the transaction ID at checkout.`;
    }

    // 5. Return & refund policy
    if (
      q.includes('return') ||
      q.includes('refund') ||
      q.includes('exchange') ||
      q.includes('রিটার্ন') ||
      q.includes('ফেরত') ||
      q.includes('বদল')
    ) {
      return isBn
        ? `🔄 **রিটার্ন ও এক্সচেঞ্জ পলিসি:**\n\nপণ্য রিসিভ করার পর কোনো প্রকার ত্রুটি বা সমস্যা থাকলে **৭ দিনের মধ্যে** রিটার্ন বা এক্সচেঞ্জের জন্য আবেদন করতে পারবেন। পণ্যটি অব্যবহৃত ও অক্ষত প্যাকেজিংসহ থাকতে হবে। বিস্তারিত জানতে আমাদের [রিটার্ন পলিসি পেজ](/returns) দেখুন।`
        : `🔄 **Returns & Refund Policy:**\n\nEligible items can be returned or exchanged within **7 days** of delivery if defective or damaged. Items must be unused and in original packaging. Read more on our [Returns Policy](/returns).`;
    }

    // 6. Offers & Discounts
    if (
      q.includes('offer') ||
      q.includes('discount') ||
      q.includes('coupon') ||
      q.includes('sale') ||
      q.includes('অফার') ||
      q.includes('ছাড়') ||
      q.includes('কুপন')
    ) {
      return isBn
        ? `🎁 **চলমান অফার ও ছাড়:**\n\nআমাদের আকর্ষণীয় ফ্ল্যাশ সেল এবং বিশেষ অফারগুলো দেখতে [হোম পেজ](/) এবং [সকল পণ্যসমূহ](/products) দেখুন। চেকআউটে ভ্যালিড প্রোমোকোড থাকলে অতিরিক্ত ছাড় পাবেন!`
        : `🎁 **Current Offers & Deals:**\n\nCheck our latest flash sales and special discounts on the [Homepage](/) and [All Products](/products). Apply valid coupon codes at checkout for extra savings!`;
    }

    // 7. Human support request
    if (
      q.includes('human') ||
      q.includes('agent') ||
      q.includes('admin') ||
      q.includes('মানুষ') ||
      q.includes('প্রতিনিধি') ||
      q.includes('কথা বলতে চাই')
    ) {
      return isBn
        ? `🧑‍💼 সরাসরি একজন এজেন্টের সাথে কথা বলতে নিচের **"এজেন্টের সাথে কথা বলুন"** বাটনে ক্লিক করুন। আমরা আপনাকে সরাসরি লাইভ সাপোর্টে যুক্ত করে দেব।`
        : `🧑‍💼 To connect directly with our support team, click the **"Talk to an agent"** button below and we'll transfer your chat to an agent.`;
    }

    // 8. Greetings
    if (
      q.includes('hello') ||
      q.includes('hi') ||
      q.includes('hey') ||
      q.includes('assalamu') ||
      q.includes('সালাম') ||
      q.includes('হ্যালো') ||
      q.includes('হাই')
    ) {
      return isBn
        ? `আসসালামু আলাইকুম! 👋 ShopLandBD-তে আপনাকে স্বাগতম। আমি কীভাবে আপনাকে সাহায্য করতে পারি? ডেলিভারি চার্জ, পেমেন্ট, রিটার্ন বা অর্ডার ট্র্যাকিং সংক্রান্ত যেকোনো প্রশ্ন জিজ্ঞেস করতে পারেন।`
        : `Hello! 👋 Welcome to ShopLandBD. How can I assist you today? Feel free to ask about delivery charges, payment options, order tracking, or return policies!`;
    }

    // 9. Products & Stock
    if (
      q.includes('product') ||
      q.includes('stock') ||
      q.includes('available') ||
      q.includes('পণ্য') ||
      q.includes('স্টক') ||
      q.includes('দাম')
    ) {
      return isBn
        ? `আমাদের পণ্যের বর্তমান মূল্য, কালার, সাইজ ও স্টক দেখতে [পণ্যসমূহ পেজ](/products) অথবা [ক্যাটাগরি পেজ](/categories) ভিজিট করুন। কোনো নির্দিষ্ট পণ্যের জন্য পণ্যের বিস্তারিত পেজে স্টক দেখানো থাকে।`
        : `To view available products, colors, sizes, and real-time stock, please browse our [Products](/products) or [Categories](/categories) page.`;
    }

    // Default polite response
    return isBn
      ? `আমি ডেলিভারি চার্জ, ডেলিভারির সময়, পেমেন্ট পদ্ধতি, রিটার্ন এবং অর্ডার ট্র্যাকিংয়ে আপনাকে সাহায্য করতে পারি।\n\nসরাসরি আমাদের এজেন্টের সাথে কথা বলতে নিচের **"এজেন্টের সাথে কথা বলুন"** বাটনে চাপুন।`
      : `I can help you with delivery charges, transit times, payment options, returns, and tracking.\n\nTo chat with an agent, tap **"Talk to an agent"** below.`;
  };

  // Start conversation on Supabase
  const ensureConversation = async (): Promise<string | null> => {
    if (conversationId) return conversationId;

    try {
      if (user) {
        const { data, error } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            guest_name: userProfile?.name || guestName || 'Customer',
            guest_phone: userProfile?.phone || guestPhone || null,
            status: 'ai',
          })
          .select('id')
          .single();

        if (!error && data?.id) {
          setConversationId(data.id);
          return data.id;
        }
      } else {
        // Try to create guest conversation via edge function
        const { data, error } = await supabase.functions.invoke('chat-ai', {
          body: {
            action: 'createGuestConversation',
            name: guestName.trim() || 'Guest Visitor',
            phone: guestPhone.trim() || '01700000000',
          },
        });

        if (!error && data?.conversationId && data?.guestToken) {
          setGuestAccessToken(data.guestToken);
          guestAccessTokenRef.current = data.guestToken;
          setConversationId(data.conversationId);
          return data.conversationId;
        }
      }
    } catch {
      // Offline or edge function not deployed - generate local conversation ID
    }

    const localConvId = `local-${crypto.randomUUID()}`;
    setConversationId(localConvId);
    return localConvId;
  };

  // Send message handler
  const handleSend = async (messageOverride?: string) => {
    const text = (messageOverride || input).trim();
    if (!text || isLoading || isStreaming || conversationStatus === 'closed') return;

    setInput('');
    const customerMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender_type: 'customer',
      content: text,
      created_at: new Date().toISOString(),
      is_read: true,
    };

    setMessages((prev) => [...prev, customerMsg]);

    // If waiting for admin in live mode
    if (conversationStatus === 'live' || waitingForAdmin) {
      if (conversationId && !conversationId.startsWith('local-')) {
        const activeGuestToken = guestAccessTokenRef.current;
        if (activeGuestToken) {
          await supabase.functions.invoke('chat-ai', {
            body: {
              action: 'sendGuestMessage',
              conversationId,
              guestToken: activeGuestToken,
              content: text,
            },
          });
        } else if (user) {
          await supabase.from('chat_messages').insert({
            conversation_id: conversationId,
            sender_type: 'customer',
            sender_id: user.id,
            content: text,
          });
        }
      }
      return;
    }

    // AI automated reply flow
    setIsLoading(true);
    const convId = await ensureConversation();

    // Check if edge function is reachable for streaming reply
    let repliedByEdge = false;
    if (convId && !convId.startsWith('local-')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(session?.access_token ? { 'x-session-token': session.access_token } : {}),
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'generateReply',
            conversationId: convId,
            guestToken: guestAccessTokenRef.current,
            stream: false,
          }),
        });

        if (resp.ok) {
          const resData = await resp.json();
          if (resData?.reply) {
            const aiMsg: ChatMessage = {
              id: crypto.randomUUID(),
              sender_type: 'ai',
              content: resData.reply,
              created_at: new Date().toISOString(),
              is_read: true,
            };
            setMessages((prev) => [...prev, aiMsg]);
            repliedByEdge = true;
          }
        }
      } catch {
        // Fall back gracefully to client-side engine
      }
    }

    // Client-side intelligent engine fallback (guarantees the user always receives a smart answer)
    if (!repliedByEdge) {
      const instantReply = await generateInstantReply(text);
      await new Promise((r) => setTimeout(r, 350));
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender_type: 'ai',
        content: instantReply,
        created_at: new Date().toISOString(),
        is_read: true,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }

    setIsLoading(false);
  };

  // Escalation to Human Admin
  const handleTalkToHuman = async () => {
    // If guest has not entered phone number, prompt for contact info first
    if (!user && !guestPhone.trim()) {
      setShowContactForm(true);
      return;
    }

    setWaitingForAdmin(true);
    setConversationStatus('live');
    setAdminWaitSeconds(0);
    adminRespondedRef.current = false;

    const systemMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender_type: 'ai',
      content: t(
        '🧑‍💼 আপনার কথোপকথন একজন প্রতিনিধির কাছে ফরোয়ার্ড করা হয়েছে। অনুগ্রহ করে অপেক্ষা করুন...',
        '🧑‍💼 Your conversation has been transferred to an admin. Please wait a moment...'
      ),
      created_at: new Date().toISOString(),
      is_read: true,
    };
    setMessages((prev) => [...prev, systemMsg]);

    // Ensure conversation exists in Supabase
    let convId = conversationId;
    if (!convId || convId.startsWith('local-')) {
      try {
        if (user) {
          const { data } = await supabase
            .from('chat_conversations')
            .insert({
              user_id: user.id,
              guest_name: userProfile?.name || guestName || 'Customer',
              guest_phone: userProfile?.phone || guestPhone || null,
              status: 'live',
            })
            .select('id')
            .single();
          if (data?.id) {
            convId = data.id;
            setConversationId(data.id);
          }
        } else {
          const { data } = await supabase.functions.invoke('chat-ai', {
            body: {
              action: 'createGuestConversation',
              name: guestName.trim() || 'Guest Customer',
              phone: guestPhone.trim(),
            },
          });
          if (data?.conversationId && data?.guestToken) {
            convId = data.conversationId;
            setConversationId(data.conversationId);
            setGuestAccessToken(data.guestToken);
            guestAccessTokenRef.current = data.guestToken;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Start wait countdown
    adminCountdownRef.current = setInterval(() => {
      setAdminWaitSeconds((prev) => prev + 1);
    }, 1000);

    // Timeout if no admin responds in 2 minutes
    adminWaitTimerRef.current = setTimeout(async () => {
      if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
      setWaitingForAdmin(false);
      setAdminWaitSeconds(0);

      if (adminRespondedRef.current) return;
      setConversationStatus('waiting_reply');

      const offlineMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender_type: 'ai',
        content: t(
          '😔 ধন্যবাদ আপনার ধৈর্যের জন্য! এই মুহূর্তে অ্যাডমিন ব্যস্ত থাকতে পারেন।\n\nআপনি আপনার প্রশ্ন বা বার্তাটি এখানে লিখে রাখতে পারেন। অ্যাডমিন অনলাইনে আসামাত্রই উত্তর প্রদান করবেন। 🙏',
          '😔 Thank you for your patience! Our agents are currently occupied.\n\nPlease leave your message here. An admin will reply as soon as they come online. 🙏'
        ),
        created_at: new Date().toISOString(),
        is_read: true,
      };
      setMessages((prev) => [...prev, offlineMsg]);
    }, ADMIN_WAIT_TIMEOUT);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim()) {
      toast({
        title: t('তথ্য দিন', 'Missing Information'),
        description: t('অনুগ্রহ করে নাম ও সঠিক ফোন নম্বর দিন।', 'Please provide your name and phone number.'),
        variant: 'destructive',
      });
      return;
    }
    if (!isValidBDPhone(guestPhone.trim())) {
      toast({
        title: t('সঠিক ফোন নম্বর দিন', 'Invalid Phone Number'),
        description: t('১১ সংখ্যার সঠিক ফোন নম্বর দিন (যেমন: 017XXXXXXXX)।', 'Enter a valid 11-digit phone number.'),
        variant: 'destructive',
      });
      return;
    }

    setShowContactForm(false);
    handleTalkToHuman();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (msg: string) => {
    if (msg.includes('এজেন্টের সাথে') || msg.includes('Talk to an agent')) {
      handleTalkToHuman();
    } else {
      handleSend(msg);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatWaitTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const showAdminTyping = adminTyping && conversationStatus === 'live';

  return (
    <>
      {/* Floating Chat Button - positioned above mobile bottom-nav without overlapping */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="chat-ripple fixed bottom-[74px] right-3.5 md:bottom-6 md:right-6 z-40 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center border-2 border-white/20"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label={t('চ্যাট ওপেন করুন', 'Open chat')}
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Main Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 z-[60] flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden border border-border/80 bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-250 md:bottom-6 md:right-6 md:h-[580px] md:w-[390px] md:rounded-2xl"
          style={{ maxHeight: '100dvh' }}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                {conversationStatus === 'waiting_reply' ? (
                  <Clock className="w-5 h-5 text-white" />
                ) : waitingForAdmin || conversationStatus === 'live' ? (
                  <Headphones className="w-5 h-5 text-white" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">
                  {t('ShopLandBD সাপোর্ট', 'ShopLandBD Support')}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[11px] opacity-90 leading-none">
                    {showAdminTyping
                      ? t('অ্যাডমিন টাইপ করছেন...', 'Admin is typing...')
                      : isStreaming || isLoading
                      ? t('লিখছে...', 'Typing...')
                      : waitingForAdmin
                      ? `${t('প্রতিনিধির অপেক্ষা')} (${formatWaitTime(adminWaitSeconds)})`
                      : conversationStatus === 'live'
                      ? t('লাইভ চ্যাট চলছে', 'Live Chat Active')
                      : conversationStatus === 'waiting_reply'
                      ? t('অফলাইন • বার্তা রাখুন', 'Offline • Leave a message')
                      : t('স্মার্ট সহকারী • অনলাইন', 'Smart Assistant • Online')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                title={t('নতুন চ্যাট', 'New Chat')}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                aria-label={t('নতুন চ্যাট শুরু করুন', 'Start new chat')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                aria-label={t('চ্যাট বন্ধ করুন', 'Close chat')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contact Details Prompt (When escalating to human support) */}
          {showContactForm && (
            <div className="bg-secondary/70 border-b border-border p-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {t('এজেন্টের সাথে কথা বলতে আপনার তথ্য দিন', 'Enter details to talk to an agent')}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t('অ্যাডমিন যাতে আপনার সাথে যোগাযোগ করতে পারেন।', 'So an agent can follow up with your inquiry.')}
                  </p>
                </div>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-2 mt-2">
                <Input
                  placeholder={t('আপনার নাম', 'Your name')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-8 text-xs bg-background"
                  required
                />
                <Input
                  placeholder={t('ফোন নম্বর (01XXXXXXXXX)', 'Phone number (01XXXXXXXXX)')}
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  type="tel"
                  className="h-8 text-xs bg-background"
                  required
                />
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" className="h-8 text-xs flex-1">
                    {t('কানেক্ট করুন', 'Connect with Agent')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setShowContactForm(false)}
                  >
                    {t('বাতিল', 'Cancel')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Messages Container */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3.5 scroll-smooth">
            {/* Welcome greeting */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-secondary/80 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] border border-border/40 shadow-sm">
                <p className="text-sm leading-relaxed">
                  {t(
                    'আসসালামু আলাইকুম! 👋 ShopLandBD-তে স্বাগতম। আমি কীভাবে আপনাকে সাহায্য করতে পারি? যেকোনো প্রশ্ন লিখতে পারেন অথবা নিচের অপশনগুলো থেকে বেছে নিন:',
                    'Hello! 👋 Welcome to ShopLandBD. How can I assist you today? You can type your question or select from the options below:'
                  )}
                </p>
              </div>
            </div>

            {/* Initial Quick Replies */}
            {messages.length === 0 && (
              <QuickReplies onSelect={handleQuickReply} isInitial={true} />
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} {...msg} />
            ))}

            {/* Waiting for Admin Banner */}
            {waitingForAdmin && !adminTyping && (
              <div className="flex gap-2 animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Headphones className="w-4 h-4 text-amber-600" />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      {t('অ্যাডমিন প্রতিনিধির সাথে যুক্ত করা হচ্ছে...', 'Connecting to an admin agent...')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {(isLoading || showAdminTyping) && (
              <TypingIndicator isAdmin={showAdminTyping} />
            )}

            {/* Follow-up Quick Replies */}
            {messages.length > 0 &&
              !isLoading &&
              !isStreaming &&
              conversationStatus === 'ai' &&
              messages[messages.length - 1]?.sender_type === 'ai' && (
                <QuickReplies onSelect={handleQuickReply} isInitial={false} />
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Handover to Human Support Pill */}
          {conversationStatus === 'ai' && !waitingForAdmin && messages.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border/50 bg-secondary/30 flex items-center justify-between">
              <button
                onClick={handleTalkToHuman}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1.5 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
                {t('এজেন্টের সাথে কথা বলুন', 'Talk to an agent')}
              </button>
              <button
                onClick={() => handleSend(t('অর্ডার ট্র্যাক করতে চাই', 'Track my order'))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('📦 অর্ডার ট্র্যাকিং', '📦 Track order')}
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className="flex flex-shrink-0 items-center gap-2 border-t bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <EmojiPicker onSelect={handleEmojiSelect} />
            <Input
              ref={inputRef}
              placeholder={
                conversationStatus === 'waiting_reply'
                  ? t('আপনার বার্তাটি লিখে রাখুন...', 'Leave your message...')
                  : t('মেসেজ লিখুন...', 'Type a message...')
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              className="text-sm h-10 flex-1 rounded-xl bg-secondary/50 border-border/70 focus-visible:ring-1"
              disabled={isLoading || isStreaming || conversationStatus === 'closed'}
            />
            <Button
              size="icon"
              className="h-10 w-10 rounded-xl flex-shrink-0 shadow-md"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isStreaming || conversationStatus === 'closed'}
            >
              {isLoading || isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
