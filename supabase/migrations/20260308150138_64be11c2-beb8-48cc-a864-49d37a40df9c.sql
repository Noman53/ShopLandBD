
-- Add is_read column to chat_messages for read receipts
ALTER TABLE public.chat_messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;

-- Enable realtime for chat_conversations (for typing indicators via presence)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
