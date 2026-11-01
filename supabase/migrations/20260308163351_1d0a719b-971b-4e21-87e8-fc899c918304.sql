
-- Fix chat_conversations: make INSERT policy PERMISSIVE for guests
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.chat_conversations;
CREATE POLICY "Anyone can create conversations"
  ON public.chat_conversations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    ((auth.uid() IS NULL) AND (user_id IS NULL))
    OR ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))
  );

-- Guests need to SELECT their own conversation (by id, stored client-side)
DROP POLICY IF EXISTS "Guests can view own conversations" ON public.chat_conversations;
CREATE POLICY "Guests can view own conversations"
  ON public.chat_conversations
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Make existing user SELECT policy permissive (it was restrictive)
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix UPDATE: allow guests to update their own conversations (e.g. switch to live)
DROP POLICY IF EXISTS "Users can update own conversation status" ON public.chat_conversations;
CREATE POLICY "Users can update own conversation status"
  ON public.chat_conversations
  FOR UPDATE
  TO anon, authenticated
  USING (
    ((auth.uid() IS NULL) AND (user_id IS NULL))
    OR ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))
  );

-- Fix chat_messages: make INSERT policy PERMISSIVE for guests
DROP POLICY IF EXISTS "Users can insert own conversation messages" ON public.chat_messages;
CREATE POLICY "Users can insert own conversation messages"
  ON public.chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (
          ((auth.uid() IS NOT NULL) AND (c.user_id = auth.uid()))
          OR ((auth.uid() IS NULL) AND (c.user_id IS NULL))
        )
    ))
    AND (
      (sender_type = 'customer')
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Fix chat_messages SELECT: allow guests to view their conversation messages
DROP POLICY IF EXISTS "Users can view own conversation messages" ON public.chat_messages;
CREATE POLICY "Users can view own conversation messages"
  ON public.chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (
          ((auth.uid() IS NOT NULL) AND (c.user_id = auth.uid()))
          OR ((auth.uid() IS NULL) AND (c.user_id IS NULL))
        )
    )
  );

-- Allow guests to update read status on messages
DROP POLICY IF EXISTS "Users can update message read status" ON public.chat_messages;
CREATE POLICY "Users can update message read status"
  ON public.chat_messages
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (
          ((auth.uid() IS NOT NULL) AND (c.user_id = auth.uid()))
          OR ((auth.uid() IS NULL) AND (c.user_id IS NULL))
        )
    )
  );
