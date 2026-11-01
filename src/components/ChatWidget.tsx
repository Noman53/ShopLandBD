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

interface ChatMessage {
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

type ChatPhase = 'intro' | 'chatting' | 'closed';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
const ADMIN_WAIT_TIMEOUT = 2 * 60 * 1000;

export default function ChatWidget() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [chatPhase, setChatPhase] = useState<ChatPhase>('intro');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestAccessToken, setGuestAccessToken] = useState<string | null>(null);
  const guestAccessTokenRef = useRef<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'ai' | 'live' | 'waiting_reply' | 'closed'>('ai');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminTyping, setAdminTyping] = useState(false);
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);
  const [adminWaitSeconds, setAdminWaitSeconds] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const justFinishedStreamingRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevUserRef = useRef<string | null>(null);
  const adminRespondedRef = useRef(false);

  // Fetch profile for logged-in user
  useEffect(() => {
    if (user && isOpen && chatPhase === 'intro') {
      setProfileLoading(true);
      supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setUserProfile(data ? { name: data.name, phone: data.phone } : { name: null, phone: null });
          setProfileLoading(false);
        });
    }
  }, [user, isOpen, chatPhase]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    guestAccessTokenRef.current = null;
    setGuestAccessToken(null);
    setConversationStatus('ai');
    setChatPhase('intro');
    setGuestName('');
    setGuestPhone('');
    setUnreadCount(0);
    setIsStreaming(false);
    setIsLoading(false);
    setWaitingForAdmin(false);
    setAdminWaitSeconds(0);
    setAdminTyping(false);
    adminRespondedRef.current = false;
    if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
    if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
  }, []);

  const handleClose = useCallback(() => {
    resetChat();
    setIsOpen(false);
  }, [resetChat]);

  // Inactivity auto-reset
  useEffect(() => {
    if (messages.length === 0) return;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => resetChat(), INACTIVITY_TIMEOUT);
    return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); };
  }, [messages, resetChat]);

  // Guest-to-login migration
  useEffect(() => {
    const currentUserId = user?.id || null;
    const prevUserId = prevUserRef.current;
    prevUserRef.current = currentUserId;
    if (!prevUserId && currentUserId && conversationId && guestAccessToken) {
      supabase.functions.invoke('chat-ai', {
        body: {
          action: 'claimGuestConversation',
          conversationId,
          guestToken: guestAccessTokenRef.current,
        },
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to link guest chat to account:', error);
          toast({
            title: t('চ্যাট সংরক্ষণ করা যায়নি', 'Could not link chat'),
            description: t('আপনার কথোপকথন অতিথি চ্যাটে চালু থাকবে।', 'Your conversation will remain available as a guest chat.'),
            variant: 'destructive',
          });
          return;
        }
        guestAccessTokenRef.current = null;
        setGuestAccessToken(null);
      });
    }
  }, [user?.id, conversationId, guestAccessToken, toast, t]);

  // Init notification sound
  useEffect(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZSQi4eCfXx9goiNkJGQjoqGg4B+foCDh4qMjY2MioiGhIKBgIGChIaIiouLi4qJiIaFhIOCgoKDhIWGh4iIiIiHhoaFhISEhIODhISFhoaHh4eHh4eGhoWFhYWFhYWFhoaGhoaGhoaGhoaFhYWFhYWFhYWFhYaGhoaGhoaGhoaGhYWFhYWFhYWFhYWFhYWF');
    audio.volume = 0.5;
    audioRef.current = audio;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Mark messages as read
  useEffect(() => {
    if (isOpen && conversationId) {
      const unreadMsgs = messages.filter(m => m.sender_type !== 'customer' && !m.is_read);
      if (unreadMsgs.length > 0) {
        const ids = unreadMsgs.map(m => m.id);
        const markAsRead = guestAccessToken
          ? supabase.functions.invoke('chat-ai', {
            body: {
              action: 'markGuestMessagesRead',
              conversationId,
              guestToken: guestAccessToken,
              messageIds: ids,
            },
          })
          : supabase.from('chat_messages').update({ is_read: true }).in('id', ids);
        markAsRead.then(({ error }) => {
          if (error) {
            console.error('Failed to mark chat messages as read:', error);
            return;
          }
          setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
        });
      }
      setUnreadCount(0);
    }
  }, [isOpen, messages, conversationId, guestAccessToken, user]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!conversationId || guestAccessToken) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Partial<ChatMessage>;
        if (
          !newMsg.id ||
          !newMsg.sender_type ||
          typeof newMsg.content !== 'string' ||
          typeof newMsg.created_at !== 'string'
        ) return;
        if (newMsg.sender_type === 'customer') return;
        if (newMsg.sender_type === 'ai' && (isStreaming || justFinishedStreamingRef.current)) return;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, {
            id: newMsg.id, sender_type: newMsg.sender_type,
            content: newMsg.content, created_at: newMsg.created_at,
            is_read: newMsg.is_read === true,
          }];
        });
        if (!isOpen) setUnreadCount(prev => prev + 1);
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
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Partial<ChatMessage>;
        if (!updated.id || typeof updated.is_read !== 'boolean') return;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, isOpen, isStreaming, guestAccessToken, user]);

  useEffect(() => {
    if (!conversationId || !guestAccessToken || !isOpen) return;
    let active = true;

    const refreshGuestChat = async () => {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          action: 'getGuestMessages',
          conversationId,
          guestToken: guestAccessToken,
        },
      });
      if (error) {
        console.error('Failed to refresh guest chat:', error);
        return;
      }
      if (!active || !data) return;

      setMessages((current) => {
        const refreshed = [...current];
        for (const message of data.messages as ChatMessage[]) {
          const byId = refreshed.findIndex((item) => item.id === message.id);
          if (byId >= 0) {
            refreshed[byId] = message;
            continue;
          }

          const optimistic = refreshed.findIndex((item) =>
            item.sender_type === message.sender_type &&
            item.content === message.content &&
            Math.abs(Date.parse(item.created_at) - Date.parse(message.created_at)) < 10000
          );
          if (optimistic >= 0) {
            refreshed[optimistic] = message;
          } else {
            refreshed.push(message);
          }
        }
        return refreshed.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      });

      if (data.status === 'closed') {
        setConversationStatus('closed');
        setChatPhase('closed');
        setWaitingForAdmin(false);
      } else if (data.status === 'live' || data.status === 'waiting_reply' || data.status === 'ai') {
        setConversationStatus(data.status);
      }
    };

    void refreshGuestChat();
    const intervalId = setInterval(() => void refreshGuestChat(), 3000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [conversationId, guestAccessToken, user, isOpen]);

  // Realtime subscription for conversation status (detect admin close)
  useEffect(() => {
    if (!conversationId || guestAccessToken) return;
    const channel = supabase
      .channel(`conv-status-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_conversations',
        filter: `id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as { status?: unknown };
        if (updated.status === 'closed') {
          setConversationStatus('closed');
          setChatPhase('closed');
          setWaitingForAdmin(false);
          if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
          if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, guestAccessToken]);

  // Admin typing presence
  useEffect(() => {
    if (!conversationId || (conversationStatus !== 'live' && !waitingForAdmin)) return;
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: user?.id || 'guest' } },
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
          setAdminWaitSeconds(0);
          if (adminWaitTimerRef.current) clearTimeout(adminWaitTimerRef.current);
          if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, conversationStatus, user?.id, waitingForAdmin]);

  const startConversation = async () => {
    if (!user) {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          action: 'createGuestConversation',
          name: guestName.trim(),
          phone: guestPhone.trim(),
        },
      });
      if (error || !data?.conversationId || !data?.guestToken) {
        console.error('Failed to create guest conversation:', error);
        return null;
      }

      setGuestAccessToken(data.guestToken);
      guestAccessTokenRef.current = data.guestToken;
      setConversationId(data.conversationId);
      setConversationStatus('ai');
      return data.conversationId as string;
    }

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user?.id || null,
        guest_name: user ? (userProfile?.name || null) : (guestName || null),
        guest_phone: user ? (userProfile?.phone || null) : (guestPhone || null),
        status: 'ai',
      })
      .select('id')
      .single();
    if (error) { console.error('Failed to create conversation:', error); return null; }
    setConversationId(data.id);
    setConversationStatus('ai');
    return data.id;
  };

  const streamAIResponse = async (convId: string) => {
    const streamMsgId = crypto.randomUUID();
    const streamMsg: ChatMessage = {
      id: streamMsgId, sender_type: 'ai', content: '',
      created_at: new Date().toISOString(), is_read: true,
    };
    setMessages(prev => [...prev, streamMsg]);
    setIsStreaming(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
      const { data: { session } } = await supabase.auth.getSession();
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
          'x-session-token': session?.access_token || '',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'generateReply',
          conversationId: convId,
          guestToken: guestAccessTokenRef.current,
          stream: true,
        }),
      });
      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Stream failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: fullContent } : m));
            }
          } catch (error) {
            console.error('Could not parse chat stream event:', error);
          }
        }
      }
      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: fullContent } : m));
            }
          } catch (error) {
            console.error('Could not parse final chat stream event:', error);
          }
        }
      }
    } catch (err: unknown) {
      console.error('Stream error:', err);
      setMessages(prev =>
        prev.map(m => m.id === streamMsgId ? {
          ...m, content: t('দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।', 'Sorry, I cannot respond right now. Please try again.'),
        } : m)
      );
    } finally {
      justFinishedStreamingRef.current = true;
      setIsStreaming(false);
      setTimeout(() => { justFinishedStreamingRef.current = false; }, 3000);
    }
  };

  const handleSend = async (messageOverride?: string) => {
    const messageText = (messageOverride || input).trim();
    if (!messageText || isLoading || isStreaming || conversationStatus === 'closed') return;
    setInput('');
    let convId = conversationId;
    if (!convId) {
      convId = await startConversation();
      if (!convId) {
        toast({ title: t('ত্রুটি', 'Error'), description: t('চ্যাট শুরু করা যায়নি', 'Could not start chat'), variant: 'destructive' });
        return;
      }
    }
    const customerMsg: ChatMessage = {
      id: crypto.randomUUID(), sender_type: 'customer', content: messageText,
      created_at: new Date().toISOString(), is_read: false,
    };
    setMessages(prev => [...prev, customerMsg]);
    const activeGuestToken = guestAccessTokenRef.current;
    const { error: saveError } = activeGuestToken
      ? await supabase.functions.invoke('chat-ai', {
        body: {
          action: 'sendGuestMessage',
          conversationId: convId,
          guestToken: activeGuestToken,
          content: messageText,
        },
      })
      : await supabase.from('chat_messages').insert({
        conversation_id: convId,
        sender_type: 'customer',
        sender_id: user?.id || null,
        content: messageText,
      });
    if (saveError) {
      console.error('Failed to save chat message:', saveError);
      setMessages(prev => prev.filter(message => message.id !== customerMsg.id));
      toast({
        title: t('বার্তা পাঠানো যায়নি', 'Message could not be sent'),
        description: t('আবার চেষ্টা করুন।', 'Please try again.'),
        variant: 'destructive',
      });
      return;
    }

    if (conversationStatus === 'ai') {
      setIsLoading(true);
      try {
        await streamAIResponse(convId);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTalkToHuman = async () => {
    if (!conversationId) return;
    const activeGuestToken = guestAccessTokenRef.current;
    const { error } = activeGuestToken
      ? await supabase.functions.invoke('chat-ai', {
        body: {
          action: 'setGuestStatus',
          conversationId,
          guestToken: activeGuestToken,
          status: 'live',
        },
      })
      : await supabase
        .from('chat_conversations')
        .update({ status: 'live' })
        .eq('id', conversationId);
    if (!error) {
      setConversationStatus('live');
      setWaitingForAdmin(true);
      setAdminWaitSeconds(0);
      adminRespondedRef.current = false;
      const systemMsg: ChatMessage = {
        id: crypto.randomUUID(), sender_type: 'ai',
        content: t('🧑‍💼 আপনার কথোপকথন এখন একজন অ্যাডমিনের কাছে পাঠানো হয়েছে। অনুগ্রহ করে অপেক্ষা করুন...', '🧑‍💼 Your conversation has been transferred to an admin. Please wait...'),
        created_at: new Date().toISOString(), is_read: true,
      };
      setMessages(prev => [...prev, systemMsg]);
      adminCountdownRef.current = setInterval(() => setAdminWaitSeconds(prev => prev + 1), 1000);
      adminWaitTimerRef.current = setTimeout(async () => {
        if (adminCountdownRef.current) clearInterval(adminCountdownRef.current);
        setWaitingForAdmin(false);
        setAdminWaitSeconds(0);
        if (adminRespondedRef.current) return;
        setConversationStatus('waiting_reply');
        const activeGuestToken = guestAccessTokenRef.current;
        if (activeGuestToken) {
          const { error: statusError } = await supabase.functions.invoke('chat-ai', {
            body: {
              action: 'setGuestStatus',
              conversationId,
              guestToken: activeGuestToken,
              status: 'waiting_reply',
            },
          });
          if (statusError) console.error('Failed to update guest chat status:', statusError);
        } else {
          const { error: statusError } = await supabase
            .from('chat_conversations')
            .update({ status: 'waiting_reply' })
            .eq('id', conversationId);
          if (statusError) console.error('Failed to update chat status:', statusError);
        }
        const offlineMsg: ChatMessage = {
          id: crypto.randomUUID(), sender_type: 'ai',
          content: t('😔 দুঃখিত, এই মুহূর্তে কোনো Admin/Owner উপলব্ধ নেই।\n\nআপনি আপনার বার্তা দিয়ে রাখতে পারেন। Admin যখন অনলাইন হবে, তখন আপনাকে reply করবে। ধন্যবাদ! 🙏', '😔 Sorry, no Admin/Owner is available right now.\n\nYou can leave your message here. The admin will reply when they come online. Thank you! 🙏'),
          created_at: new Date().toISOString(), is_read: true,
        };
        setMessages(prev => [...prev, offlineMsg]);
      }, ADMIN_WAIT_TIMEOUT);
    }
  };

  // Intro confirm handler
  const handleIntroConfirm = () => {
    if (!user && (!guestName.trim() || !guestPhone.trim())) return;
    setChatPhase('chatting');
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setChatPhase('intro');
    setUnreadCount(0);
  };

  const handleStartNewChat = () => {
    resetChat();
    setChatPhase('intro');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuickReply = (msg: string) => {
    if (msg.includes('মানুষের সাথে') || msg.includes('Talk to a human')) {
      if (conversationId) handleTalkToHuman();
      else handleSend(msg);
    } else {
      handleSend(msg);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatWaitTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating Button — smaller, more right, lighter, with ripple */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="chat-ripple fixed bottom-32 right-2 md:bottom-6 md:right-4 z-[60] w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/75 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center backdrop-blur-sm"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Open chat"
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-4 z-[60] w-full md:w-96 h-[100dvh] md:h-[560px] bg-card border md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                {conversationStatus === 'waiting_reply' ? <Clock className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{t('সাহায্যকারী', 'Support')}</p>
                <p className="text-[11px] opacity-80">
                  {chatPhase === 'intro'
                    ? t('স্বাগতম!', 'Welcome!')
                    : chatPhase === 'closed'
                    ? t('কথোপকথন বন্ধ', 'Conversation closed')
                    : adminTyping
                    ? t('টাইপ করছে...', 'Typing...')
                    : isStreaming
                    ? t('লিখছে...', 'Writing...')
                    : waitingForAdmin
                    ? `${t('অপেক্ষা করুন', 'Waiting')} ${formatWaitTime(adminWaitSeconds)}`
                    : conversationStatus === 'ai'
                    ? t('স্বয়ংক্রিয় সহায়তা • অনলাইন', 'Automated support • Online')
                    : conversationStatus === 'live'
                    ? t('লাইভ চ্যাট', 'Live Chat')
                    : conversationStatus === 'waiting_reply'
                    ? t('অফলাইন • বার্তা রাখুন', 'Offline • Leave a message')
                    : t('বন্ধ', 'Closed')}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors" aria-label={t('চ্যাট বন্ধ করুন', 'Close chat')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* INTRO PHASE */}
          {chatPhase === 'intro' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-5">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-base">
                  {t('চ্যাট শুরু করুন', 'Start a Chat')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {user
                    ? t('আপনার তথ্য নিশ্চিত করুন', 'Please confirm your information')
                    : t('আপনার নাম ও ফোন নম্বর দিন', 'Enter your name and phone number')}
                </p>
              </div>

              {profileLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : user ? (
                // Logged-in user: show confirmation
                <div className="w-full space-y-3">
                  <div className="bg-secondary rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('নাম', 'Name')}</span>
                      <span className="text-sm font-medium">{userProfile?.name || t('অজানা', 'Unknown')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('ফোন', 'Phone')}</span>
                      <span className="text-sm font-medium">{userProfile?.phone || t('নেই', 'N/A')}</span>
                    </div>
                  </div>
                  <Button onClick={handleIntroConfirm} className="w-full h-10 text-sm font-semibold">
                    {t('নিশ্চিত করুন ও চ্যাট শুরু করুন', 'Confirm & Start Chat')}
                  </Button>
                </div>
              ) : (
                // Guest: name + phone input
                <form onSubmit={(e) => { e.preventDefault(); handleIntroConfirm(); }} className="w-full space-y-3">
                  <Input
                    placeholder={t('আপনার নাম', 'Your name')}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="text-sm h-10"
                    autoFocus
                  />
                  <Input
                    placeholder={t('ফোন নম্বর', 'Phone number')}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="text-sm h-10"
                    type="tel"
                  />
                  <Button
                    type="submit"
                    className="w-full h-10 text-sm font-semibold"
                    disabled={!guestName.trim() || !guestPhone.trim()}
                  >
                    {t('চ্যাট শুরু করুন', 'Start Chat')}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* CLOSED PHASE */}
          {chatPhase === 'closed' && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((msg) => (
                  <ChatMessageComponent key={msg.id} {...msg} />
                ))}
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-center space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    {t('এই কথোপকথন বন্ধ করা হয়েছে।', 'This conversation has been closed.')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('নতুন চ্যাট শুরু করতে নিচের বাটনে ক্লিক করুন।', 'Click the button below to start a new chat.')}
                  </p>
                </div>
                <div ref={messagesEndRef} />
              </div>
              <div className="px-4 pb-3 pt-1 border-t">
                <Button onClick={handleStartNewChat} className="w-full h-10 text-sm gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t('নতুন চ্যাট শুরু করুন', 'Start New Chat')}
                </Button>
              </div>
            </>
          )}

          {/* CHATTING PHASE */}
          {chatPhase === 'chatting' && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <>
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-secondary rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                        <p className="text-sm">
                          {t('আসসালামু আলাইকুম! 👋 আমি আপনাকে কিভাবে সাহায্য করতে পারি?', 'Hello! 👋 How can I help you today?')}
                        </p>
                      </div>
                    </div>
                    <QuickReplies onSelect={handleQuickReply} isInitial={true} />
                  </>
                )}
                {messages.map((msg) => (
                  <ChatMessageComponent key={msg.id} {...msg} />
                ))}
                {waitingForAdmin && !adminTyping && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-4 h-4 text-accent" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {t('Admin এর জন্য অপেক্ষা করা হচ্ছে...', 'Waiting for admin...')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {(isLoading || (adminTyping && !waitingForAdmin)) && <TypingIndicator isAdmin={adminTyping} />}
                {messages.length > 0 && !isLoading && !isStreaming && conversationStatus === 'ai' && messages[messages.length - 1]?.sender_type === 'ai' && (
                  <QuickReplies onSelect={handleQuickReply} isInitial={false} />
                )}
                <div ref={messagesEndRef} />
              </div>

              {conversationStatus === 'ai' && messages.length > 0 && !isStreaming && (
                <div className="px-4 pb-2">
                  <button
                    onClick={handleTalkToHuman}
                    className="w-full text-xs py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    {t('মানুষের সাথে কথা বলুন', 'Talk to human')}
                  </button>
                </div>
              )}

              <div className="px-3 pb-3 pt-1 border-t flex items-center gap-1.5">
                <EmojiPicker onSelect={handleEmojiSelect} />
                <Input
                  ref={inputRef}
                  placeholder={
                    conversationStatus === 'waiting_reply'
                      ? t('আপনার বার্তা দিয়ে রাখুন...', 'Leave your message...')
                      : t('মেসেজ লিখুন...', 'Type a message...')
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={4000}
                  className="text-sm h-10 flex-1"
                  disabled={isLoading || isStreaming || conversationStatus === 'closed' || waitingForAdmin}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading || isStreaming || conversationStatus === 'closed' || waitingForAdmin}
                >
                  {(isLoading || isStreaming) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
