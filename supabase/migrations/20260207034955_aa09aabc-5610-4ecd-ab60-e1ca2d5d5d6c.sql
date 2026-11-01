
-- Fix the overly permissive insert policy on order_status_history
DROP POLICY "Anyone can insert status history" ON public.order_status_history;

-- Replace with a more restrictive policy: only allow inserts if user owns the order or is admin
CREATE POLICY "Users can insert own order status history"
ON public.order_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_status_history.order_id 
    AND (
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid())
      OR (auth.uid() IS NULL AND orders.user_id IS NULL)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
