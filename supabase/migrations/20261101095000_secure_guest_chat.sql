ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS guest_access_token_hash text;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_status_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_status_check
  CHECK (status IN ('ai', 'live', 'waiting_reply', 'closed'));

CREATE INDEX IF NOT EXISTS idx_chat_conversations_guest_access_token_hash
  ON public.chat_conversations (guest_access_token_hash)
  WHERE guest_access_token_hash IS NOT NULL;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('chat_conversations', 'chat_messages')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

REVOKE ALL ON public.chat_conversations, public.chat_messages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT UPDATE (is_read) ON public.chat_messages TO authenticated;

CREATE POLICY "Authenticated users and admins can view conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users and admins can create conversations"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users and admins can update conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete conversations"
  ON public.chat_conversations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and admins can view conversation messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          conversation.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Customers and admins can send conversation messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    (
      sender_type = 'customer'
      AND sender_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.chat_conversations conversation
        WHERE conversation.id = chat_messages.conversation_id
          AND conversation.user_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users and admins can update message read state"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          conversation.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          conversation.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Admins can delete conversation messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.chat_request_limits (
  request_key text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count > 0),
  PRIMARY KEY (request_key, window_started_at)
);

ALTER TABLE public.chat_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_request_limits FROM anon, authenticated;
GRANT ALL ON public.chat_request_limits TO service_role;

CREATE OR REPLACE FUNCTION public.increment_chat_request_limit(
  p_request_key text,
  p_window_started_at timestamptz,
  p_limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_limit < 1 OR p_limit > 120 THEN
    RAISE EXCEPTION 'Invalid rate limit';
  END IF;

  INSERT INTO public.chat_request_limits AS limits (
    request_key,
    window_started_at,
    request_count
  )
  VALUES (p_request_key, p_window_started_at, 1)
  ON CONFLICT (request_key, window_started_at)
  DO UPDATE SET request_count = limits.request_count + 1
  RETURNING request_count INTO current_count;

  IF extract(minute FROM p_window_started_at) = 0 THEN
    DELETE FROM public.chat_request_limits
    WHERE window_started_at < now() - interval '24 hours';
  END IF;

  RETURN current_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_chat_request_limit(text, timestamptz, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_chat_request_limit(text, timestamptz, integer)
  TO service_role;
