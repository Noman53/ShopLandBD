-- Tighten guest checkout INSERT policies (avoid always-true) and fix role targeting

-- ORDERS
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Basic required fields
  customer_name IS NOT NULL AND length(trim(customer_name)) > 0 AND
  customer_phone IS NOT NULL AND customer_phone ~ '^01[3-9][0-9]{8}$' AND
  customer_address IS NOT NULL AND length(trim(customer_address)) > 0 AND
  customer_city IS NOT NULL AND length(trim(customer_city)) > 0 AND
  subtotal IS NOT NULL AND subtotal > 0 AND
  total IS NOT NULL AND total > 0 AND
  payment_method IS NOT NULL AND payment_method IN ('cod','bkash') AND
  payment_status IS NOT NULL AND payment_status IN ('pending','verified','paid','failed') AND
  order_status IS NOT NULL AND order_status IN ('pending','confirmed','shipped','delivered','cancelled') AND

  -- user_id must match session when authenticated; must be NULL for guest
  (
    (auth.uid() IS NULL AND user_id IS NULL) OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
  ) AND

  -- bKash fields consistency
  (
    (payment_method = 'cod' AND bkash_sender_number IS NULL AND bkash_transaction_id IS NULL AND bkash_paid_amount IS NULL)
    OR
    (payment_method = 'bkash' AND bkash_sender_number IS NOT NULL AND bkash_transaction_id IS NOT NULL AND bkash_paid_amount IS NOT NULL AND bkash_paid_amount > 0)
  )
);

-- ORDER ITEMS
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL AND
  quantity IS NOT NULL AND quantity > 0 AND
  price IS NOT NULL AND price >= 0 AND
  length(trim(product_name_en)) > 0 AND
  length(trim(product_name_bn)) > 0 AND
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NULL AND o.user_id IS NULL) OR
        (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
      )
  )
);

-- STORAGE: allow admins to upload images to the existing public bucket
-- (Used for bKash QR and other admin-managed assets)
DROP POLICY IF EXISTS "Public can view product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product-images" ON storage.objects;

CREATE POLICY "Public can view product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
