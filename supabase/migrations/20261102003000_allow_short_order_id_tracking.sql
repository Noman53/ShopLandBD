CREATE OR REPLACE FUNCTION public.track_order_public(p_order_id text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref text := lower(ltrim(trim(p_order_id), '#'));
  v_phone text := regexp_replace(p_phone, '[\s\-]', '', 'g');
  v_result jsonb;
  v_target_id uuid;
BEGIN
  IF v_phone LIKE '+880%' THEN
    v_phone := '0' || substring(v_phone from 5);
  ELSIF v_phone LIKE '880%' AND length(v_phone) = 13 THEN
    v_phone := '0' || substring(v_phone from 4);
  ELSIF v_phone LIKE '1%' AND length(v_phone) = 10 THEN
    v_phone := '0' || v_phone;
  END IF;

  -- Find order matching either full UUID or 8-character prefix
  SELECT o.id INTO v_target_id
  FROM public.orders o
  WHERE (o.id::text = v_ref OR o.id::text LIKE v_ref || '%')
    AND o.customer_phone = v_phone
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'order_status', o.order_status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'total', o.total,
    'subtotal', o.subtotal,
    'created_at', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_name_bn', oi.product_name_bn,
        'product_name_en', oi.product_name_en,
        'quantity', oi.quantity,
        'price', oi.price
      ) ORDER BY oi.created_at)
      FROM public.order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', h.id,
        'status', h.status,
        'note', h.note,
        'created_at', h.created_at
      ) ORDER BY h.created_at)
      FROM public.order_status_history h WHERE h.order_id = o.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.orders o
  WHERE o.id = v_target_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order_public(text, text) TO anon, authenticated;
