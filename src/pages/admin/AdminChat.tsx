import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import AdminLayout from '@/components/admin/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, User, CheckCircle2, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import ChatAttachment from '@/components/chat/chatAttachment';
import { parseChatAttachment } from '@/components/chat/chatAttachmentUtils';

interface Conversation {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatPresence {
  role?: string;
  typing?: boolean;
}

export default function AdminChat() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [customerTyping, setCustomerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .in('status', ['ai', 'live', 'waiting_reply'])
      .order('updated_at', { ascending: false });

    if (data) {
      const convsWithMsg = await Promise.all(
        data.map(async (conv) => {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('content, sender_type, is_read')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Count unread customer messages
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'customer')
            .eq('is_read', false);

          return {
            ...conv,
            lastMessage: msgs?.[0]?.content || '',
            unreadCount: count || 0,
          };
        })
      );
      setConversations(convsWithMsg);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('admin-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  // Fetch messages for selected conversation + mark as read
  useEffect(() => {
    if (!selectedConv) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', selectedConv)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);

        // Mark unread customer messages as read
        const unreadIds = data
          .filter(m => m.sender_type === 'customer' && !m.is_read)
          .map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
          fetchConversations();
        }
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`admin-chat-${selectedConv}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${selectedConv}`,
      }, async (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Auto-mark customer messages as read since admin is viewing
        if (newMsg.sender_type === 'customer' && !newMsg.is_read) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('id', newMsg.id);
        }

        if (newMsg.sender_type === 'customer') {
          setCustomerTyping(false);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${selectedConv}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv, fetchConversations]);

  // Typing indicator presence channel
  useEffect(() => {
    if (!selectedConv || !user) return;

    const channel = supabase.channel(`typing-${selectedConv}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<ChatPresence>();
        const isTyping = Object.values(state).some((presences) =>
          presences.some((presence) => presence.role === 'customer' && presence.typing)
        );
        setCustomerTyping(isTyping);
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [selectedConv, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Broadcast admin typing
  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !user) return;
    typingChannelRef.current.track({ role: 'admin', typing: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ role: 'admin', typing: false });
    }, 2000);
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || !selectedConv || !user) return;

    const content = input.trim();
    setInput('');

    // Stop typing indicator
    typingChannelRef.current?.track({ role: 'admin', typing: false });

    await supabase.from('chat_messages').insert({
      conversation_id: selectedConv,
      sender_type: 'admin',
      sender_id: user.id,
      content,
    });
  };

  const handleCloseConversation = async (convId: string) => {
    await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', convId);

    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      sender_type: 'ai',
      content: t('এই কথোপকথন বন্ধ করা হয়েছে। ধন্যবাদ!', 'This conversation has been closed. Thank you!'),
    });

    if (selectedConv === convId) {
      setSelectedConv(null);
      setMessages([]);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const liveConversations = conversations.filter(c => c.status === 'live');
  const waitingConversations = conversations.filter(c => c.status === 'waiting_reply');
  const aiConversations = conversations.filter(c => c.status === 'ai');
  const getLastMessagePreview = (content?: string) =>
    content && parseChatAttachment(content)
      ? t('📎 সংযুক্তি', '📎 Attachment')
      : content;
  const renderMessageContent = (msg: ChatMessage, conversationId: string) => {
    const attachment = parseChatAttachment(msg.content);
    if (attachment) {
      return (
        <ChatAttachment
          attachment={attachment}
          conversationId={conversationId}
          unavailableLabel={t('সংযুক্তিটি খোলা যাচ্ছে না', 'Attachment unavailable')}
          loadingLabel={t('সংযুক্তি লোড হচ্ছে', 'Loading attachment')}
        />
      );
    }
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold">{t('লাইভ চ্যাট', 'Live Chat')}</h1>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread} {t('অপঠিত', 'unread')}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
          {/* Conversation List */}
          <div className="md:col-span-1 bg-card border rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b">
              <p className="text-sm font-medium text-muted-foreground">
                {t('কথোপকথন', 'Conversations')}
              </p>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t('লোড হচ্ছে...', 'Loading...')}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {t('কোনো সক্রিয় চ্যাট নেই', 'No active chats')}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {liveConversations.length > 0 && (
                    <div className="px-3 py-1.5 bg-destructive/5">
                      <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider">
                        {t('লাইভ', 'Live')} ({liveConversations.length})
                      </p>
                    </div>
                  )}
                  {liveConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConv(conv.id)}
                      className={cn(
                        'w-full text-left px-3 py-3 hover:bg-secondary/50 transition-colors',
                        selectedConv === conv.id && 'bg-secondary'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {conv.guest_name || conv.user_id?.slice(0, 8) || t('অতিথি', 'Guest')}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          {(conv.unreadCount || 0) > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                              {conv.unreadCount}
                            </Badge>
                          )}
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            LIVE
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{getLastMessagePreview(conv.lastMessage)}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {format(new Date(conv.updated_at), 'hh:mm a')}
                      </p>
                    </button>
                  ))}

                  {waitingConversations.length > 0 && (
                    <div className="px-3 py-1.5 bg-yellow-500/5">
                      <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wider">
                        {t('অপেক্ষমাণ বার্তা', 'Waiting Reply')} ({waitingConversations.length})
                      </p>
                    </div>
                  )}
                  {waitingConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConv(conv.id)}
                      className={cn(
                        'w-full text-left px-3 py-3 hover:bg-secondary/50 transition-colors',
                        selectedConv === conv.id && 'bg-secondary'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {conv.guest_name || conv.user_id?.slice(0, 8) || t('অতিথি', 'Guest')}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          {(conv.unreadCount || 0) > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                              {conv.unreadCount}
                            </Badge>
                          )}
                          <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500 text-white">
                            {t('অপেক্ষমাণ', 'WAITING')}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{getLastMessagePreview(conv.lastMessage)}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {format(new Date(conv.updated_at), 'hh:mm a')}
                      </p>
                    </button>
                  ))}

                  {aiConversations.length > 0 && (
                    <div className="px-3 py-1.5 bg-muted/30">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('স্বয়ংক্রিয় সহায়তা', 'Automated support')} ({aiConversations.length})
                      </p>
                    </div>
                  )}
                  {aiConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConv(conv.id)}
                      className={cn(
                        'w-full text-left px-3 py-3 hover:bg-secondary/50 transition-colors',
                        selectedConv === conv.id && 'bg-secondary'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {conv.guest_name || conv.user_id?.slice(0, 8) || t('অতিথি', 'Guest')}
                        </span>
                        {(conv.unreadCount || 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-4 ml-auto">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{getLastMessagePreview(conv.lastMessage)}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 bg-card border rounded-xl overflow-hidden flex flex-col">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-muted-foreground">
                    {t('একটি কথোপকথন নির্বাচন করুন', 'Select a conversation')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-sm">
                        {conversations.find(c => c.id === selectedConv)?.guest_name ||
                         conversations.find(c => c.id === selectedConv)?.user_id?.slice(0, 8) ||
                         t('অতিথি', 'Guest')}
                      </span>
                      {customerTyping && (
                        <p className="text-[11px] text-primary animate-pulse">
                          {t('টাইপ করছে...', 'typing...')}
                        </p>
                      )}
                    </div>
                    {conversations.find(c => c.id === selectedConv)?.status === 'live' && (
                      <Badge variant="destructive" className="text-[10px]">LIVE</Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloseConversation(selectedConv)}
                    className="text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {t('বন্ধ করুন', 'Close')}
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2',
                          msg.sender_type === 'admin' && 'flex-row-reverse'
                        )}
                      >
                        <div className="flex flex-col max-w-[75%]">
                          <div
                            className={cn(
                              'rounded-2xl px-3 py-2 text-sm',
                              msg.sender_type === 'admin'
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : msg.sender_type === 'customer'
                                ? 'bg-secondary rounded-tl-sm'
                                : 'bg-muted/50 rounded-tl-sm italic'
                            )}
                          >
                            {renderMessageContent(msg, selectedConv)}
                          </div>
                          <div className={cn(
                            'flex items-center gap-1 mt-0.5',
                            msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[10px] text-muted-foreground/50">
                              {format(new Date(msg.created_at), 'hh:mm a')}
                            </span>
                            {msg.sender_type === 'admin' && (
                              msg.is_read
                                ? <CheckCheck className="w-3 h-3 text-primary" />
                                : <Check className="w-3 h-3 text-muted-foreground/40" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Customer typing indicator */}
                    {customerTyping && (
                      <div className="flex gap-2">
                        <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="px-4 pb-3 pt-1 flex gap-2 border-t">
                  <Input
                    placeholder={t('উত্তর লিখুন...', 'Type a reply...')}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      broadcastTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="text-sm h-10"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
