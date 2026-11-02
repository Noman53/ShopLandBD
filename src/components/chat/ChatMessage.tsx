import React from 'react';
import { User, MessageCircle, Headphones, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import ChatAttachment from '@/components/chat/chatAttachment';
import { parseChatAttachment } from '@/components/chat/chatAttachmentUtils';

interface ChatMessageProps {
  id: string;
  sender_type: 'customer' | 'ai' | 'admin';
  content: string;
  created_at: string;
  is_read: boolean;
  conversationId?: string;
  guestToken?: string | null;
  isGuest?: boolean;
  unavailableAttachmentLabel?: string;
  loadingAttachmentLabel?: string;
}

export default function ChatMessage({
  sender_type,
  content,
  created_at,
  is_read,
  conversationId,
  guestToken,
  isGuest,
  unavailableAttachmentLabel,
  loadingAttachmentLabel,
}: ChatMessageProps) {
  const isCustomer = sender_type === 'customer';
  const timeStr = format(new Date(created_at), 'h:mm a');
  const attachment = parseChatAttachment(content);

  return (
    <div className={cn('flex gap-2', isCustomer && 'flex-row-reverse')}>
      {/* Avatar */}
      {!isCustomer && (
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          sender_type === 'ai' ? 'bg-primary/10' : 'bg-accent/20'
        )}>
          {sender_type === 'ai' ? (
            <MessageCircle className="w-4 h-4 text-primary" />
          ) : (
            <Headphones className="w-4 h-4 text-accent" />
          )}
        </div>
      )}

      <div className="flex flex-col max-w-[80%]">
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm',
            isCustomer
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : sender_type === 'admin'
              ? 'bg-accent/10 border border-accent/20 rounded-tl-sm'
              : 'bg-secondary rounded-tl-sm'
          )}
        >
          {attachment && (conversationId || attachment.path.split('/')[0]) ? (
            <ChatAttachment
              attachment={attachment}
              conversationId={conversationId || attachment.path.split('/')[0]}
              guestToken={guestToken}
              isGuest={isGuest}
              unavailableLabel={unavailableAttachmentLabel}
              loadingLabel={loadingAttachmentLabel}
            />
          ) : isCustomer ? (
            <p>{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Time + read receipt */}
        <div className={cn('flex items-center gap-1 mt-0.5', isCustomer ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground/60">{timeStr}</span>
          {isCustomer && (
            is_read ? (
              <CheckCheck className="w-3 h-3 text-primary" />
            ) : (
              <Check className="w-3 h-3 text-muted-foreground/40" />
            )
          )}
        </div>
      </div>

      {isCustomer && (
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
}
