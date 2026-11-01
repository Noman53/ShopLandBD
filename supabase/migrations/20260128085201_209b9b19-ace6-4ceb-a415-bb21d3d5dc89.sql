-- Fix the orders RLS policy to allow anyone to create orders
-- The issue is that the current policy uses RESTRICTIVE mode

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a new PERMISSIVE INSERT policy
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Also fix order_items if needed
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);