import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ChatAttachmentData } from '@/components/chat/chatAttachmentUtils';

interface ChatAttachmentProps {
  attachment: ChatAttachmentData;
  conversationId: string;
  guestToken?: string | null;
  isGuest?: boolean;
  unavailableLabel?: string;
  loadingLabel?: string;
}

export default function ChatAttachment({
  attachment,
  conversationId,
  guestToken,
  isGuest = false,
  unavailableLabel = 'Attachment unavailable',
  loadingLabel = 'Loading attachment',
}: ChatAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const resolveUrl = async () => {
      if (isGuest && guestToken) {
        const { data, error } = await supabase.functions.invoke('chat-ai', {
          body: {
            action: 'getChatAttachmentUrl',
            conversationId,
            guestToken,
            path: attachment.path,
          },
        });
        if (error || typeof data?.url !== 'string') throw error ?? new Error('Attachment URL unavailable');
        return data.url as string;
      }

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(attachment.path, 10 * 60);
      if (error) throw error;
      return data.signedUrl;
    };

    resolveUrl()
      .then((signedUrl) => {
        if (active) setUrl(signedUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [attachment.path, conversationId, guestToken, isGuest]);

  if (failed) {
    return <p className="text-xs opacity-80">{unavailableLabel}</p>;
  }

  if (!url) {
    return <Loader2 className="h-4 w-4 animate-spin" aria-label={loadingLabel} />;
  }

  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(attachment.type)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-full">
        <img
          src={url}
          alt={attachment.name}
          className="max-h-56 max-w-full rounded-lg object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
        <span className="mt-1 block max-w-56 truncate text-xs opacity-80">{attachment.name}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-full items-center gap-2 rounded-lg border border-current/15 bg-background/30 p-2 text-sm underline-offset-2 hover:underline"
    >
      <FileText className="h-5 w-5 flex-shrink-0" />
      <span className="max-w-48 truncate">{attachment.name}</span>
    </a>
  );
}
