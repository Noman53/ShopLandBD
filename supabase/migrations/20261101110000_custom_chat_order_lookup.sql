CREATE OR REPLACE FUNCTION public.track_order_chat(
  p_order_reference text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reference text := lower(ltrim(trim(p_order_reference), '#'));
  v_phone text := regexp_replace(p_phone, '[\s\-]', '', 'g');
  v_match_count integer;
  v_result jsonb;
BEGIN
  IF v_reference !~ '^[0-9a-f]{8}$'
     AND v_reference !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  IF v_phone LIKE '+880%' THEN
    v_phone := '0' || substring(v_phone from 5);
  ELSIF v_phone LIKE '880%' AND length(v_phone) = 13 THEN
    v_phone := '0' || substring(v_phone from 4);
  ELSIF v_phone LIKE '1%' AND length(v_phone) = 10 THEN
    v_phone := '0' || v_phone;
  END IF;

  IF v_phone !~ '^01[3-9][0-9]{8}$' THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_match_count
  FROM public.orders o
  WHERE o.id::text LIKE v_reference || '%'
    AND o.customer_phone = v_phone;

  IF v_match_count <> 1 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'order_status', o.order_status,
    'payment_status', o.payment_status
  ) INTO v_result
  FROM public.orders o
  WHERE o.id::text LIKE v_reference || '%'
    AND o.customer_phone = v_phone
  LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.track_order_chat(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order_chat(text, text) TO service_role;
