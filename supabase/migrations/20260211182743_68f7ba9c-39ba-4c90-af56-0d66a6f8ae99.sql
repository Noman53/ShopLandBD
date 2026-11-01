
CREATE OR REPLACE FUNCTION public.process_order_with_stock_check(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_city text,
  p_customer_email text,
  p_subtotal numeric,
  p_total numeric,
  p_payment_method text,
  p_payment_status text,
  p_order_status text,
  p_user_id uuid,
  p_bkash_sender_number text,
  p_bkash_transaction_id text,
  p_bkash_paid_amount numeric,
  p_notes text,
  p_order_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_current_stock int;
  v_has_variants boolean;
  v_variant_total_stock int;
BEGIN
  -- SECURITY: Validate user_id matches session for authenticated requests
  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
      RAISE EXCEPTION 'user_id must match authenticated user';
    END IF;
  END IF;
  
  -- SECURITY: Anonymous users must have NULL user_id
  IF auth.uid() IS NULL THEN
    IF p_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Anonymous users cannot set user_id';
    END IF;
  END IF;

  -- Lock and update stock atomically for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    
    -- Lock product row
    SELECT stock_quantity, 
           COALESCE(is_wearable, false) OR COALESCE(has_color_variants, false)
    INTO v_current_stock, v_has_variants
    FROM products
    WHERE id = v_product_id AND is_active = true
    FOR UPDATE;
    
    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_product_id;
    END IF;
    
    IF v_has_variants THEN
      -- For variant products, check total stock from product_sizes
      SELECT COALESCE(SUM(CASE WHEN is_available THEN GREATEST(stock_quantity, 0) ELSE 0 END), 0)
      INTO v_variant_total_stock
      FROM product_sizes
      WHERE product_id = v_product_id;
      
      IF v_variant_total_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
      END IF;
      
      -- Deduct from variant rows (spread across available variants)
      WITH deduction AS (
        SELECT id, stock_quantity,
               LEAST(stock_quantity, v_quantity - COALESCE(
                 SUM(LEAST(stock_quantity, v_quantity)) OVER (
                   ORDER BY stock_quantity DESC
                   ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                 ), 0)
               ) as to_deduct
        FROM product_sizes
        WHERE product_id = v_product_id AND is_available = true AND stock_quantity > 0
        ORDER BY stock_quantity DESC
      )
      UPDATE product_sizes ps
      SET stock_quantity = ps.stock_quantity - d.to_deduct
      FROM (
        SELECT id, 
               GREATEST(0, LEAST(stock_quantity, 
                 v_quantity - COALESCE((
                   SELECT SUM(LEAST(ps2.stock_quantity, v_quantity))
                   FROM product_sizes ps2
                   WHERE ps2.product_id = v_product_id 
                     AND ps2.is_available = true 
                     AND ps2.stock_quantity > 0
                     AND ps2.size_order < product_sizes.size_order
                 ), 0)
               )) as to_deduct
        FROM product_sizes
        WHERE product_id = v_product_id AND is_available = true AND stock_quantity > 0
        ORDER BY size_order ASC
      ) d
      WHERE ps.id = d.id AND d.to_deduct > 0;
      
    ELSE
      -- For non-variant products, use base stock
      IF v_current_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
      END IF;
      
      UPDATE products 
      SET stock_quantity = stock_quantity - v_quantity
      WHERE id = v_product_id;
    END IF;
  END LOOP;
  
  -- Create order after stock reserved
  INSERT INTO orders (
    customer_name, customer_phone, customer_address, customer_city,
    customer_email, subtotal, total, payment_method, payment_status,
    order_status, user_id, bkash_sender_number, bkash_transaction_id,
    bkash_paid_amount, notes
  ) VALUES (
    p_customer_name, p_customer_phone, p_customer_address, p_customer_city,
    p_customer_email, p_subtotal, p_total, p_payment_method, p_payment_status,
    p_order_status, p_user_id, p_bkash_sender_number, p_bkash_transaction_id,
    p_bkash_paid_amount, p_notes
  ) RETURNING id INTO v_order_id;
  
  -- Insert order items
  INSERT INTO order_items (order_id, product_id, product_name_bn, product_name_en, quantity, price)
  SELECT 
    v_order_id,
    (item->>'product_id')::uuid,
    item->>'product_name_bn',
    item->>'product_name_en',
    (item->>'quantity')::int,
    (item->>'price')::numeric
  FROM jsonb_array_elements(p_order_items) AS item;
  
  RETURN v_order_id;
END;
$function$;
