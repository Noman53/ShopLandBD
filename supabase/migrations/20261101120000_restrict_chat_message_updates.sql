REVOKE UPDATE ON public.chat_messages FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_read) ON public.chat_messages TO authenticated;
