-- Fix the orders INSERT policy to allow ALL roles including anon
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create INSERT policy that allows anon, authenticated, and public roles
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated, public
WITH CHECK (true);

-- Fix order_items as well
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
TO anon, authenticated, public
WITH CHECK (true);