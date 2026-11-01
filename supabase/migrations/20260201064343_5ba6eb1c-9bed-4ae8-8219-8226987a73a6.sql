-- Fix #1: Add constraint to prevent negative stock
ALTER TABLE public.products 
ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);

-- Fix #2: Create atomic stock reservation function to prevent race conditions
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
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_current_stock int;
BEGIN
  -- Lock and update stock atomically for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    
    -- Lock product row and check stock
    SELECT stock_quantity INTO v_current_stock
    FROM products
    WHERE id = v_product_id AND is_active = true
    FOR UPDATE;
    
    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found or inactive: %', v_product_id;
    END IF;
    
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
    END IF;
    
    -- Deduct stock
    UPDATE products 
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = v_product_id;
  END LOOP;
  
  -- Create order after stock reserved
  INSERT INTO orders (
    customer_name, customer_phone, customer_address, customer_city,
    customer_email, subtotal, total, payment_method, payment_status,
    order_status, user_id, bkash_sender_number, bkash_transaction_id,
    bkash_paid_amount, notes
  ) VALUES (
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_customer_city,
    p_customer_email,
    p_subtotal,
    p_total,
    p_payment_method,
    p_payment_status,
    p_order_status,
    p_user_id,
    p_bkash_sender_number,
    p_bkash_transaction_id,
    p_bkash_paid_amount,
    p_notes
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
$$;

-- Grant execute to authenticated and anon for guest checkout support
GRANT EXECUTE ON FUNCTION public.process_order_with_stock_check TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_with_stock_check TO anon;