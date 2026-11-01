-- Fix the orders INSERT policy to allow BOTH anonymous and authenticated users
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create INSERT policy that allows both public and authenticated roles
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO public, authenticated
WITH CHECK (true);

-- Fix order_items as well
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
TO public, authenticated
WITH CHECK (true);