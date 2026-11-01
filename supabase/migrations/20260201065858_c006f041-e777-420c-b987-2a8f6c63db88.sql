-- Fix RLS for profiles: Add explicit policy to deny anonymous access
-- Current policies only check auth.uid() = user_id, which could allow anonymous if misconfigured

-- Drop existing policies and recreate with explicit authenticated check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with explicit role checks (only authenticated users)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix RLS for orders: Add explicit policy to deny anonymous SELECT access
-- Keep INSERT for guest checkout but restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

-- Recreate with explicit role check (only authenticated users can view their orders)
CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Fix store_settings: Create separate policies for public vs sensitive data
-- Sensitive keys that should be admin-only: bkash_number, bkash_account_type, store_phone
DROP POLICY IF EXISTS "Anyone can read settings" ON public.store_settings;

-- Public can only read non-sensitive settings
CREATE POLICY "Public can read non-sensitive settings" 
ON public.store_settings 
FOR SELECT 
USING (
  key NOT IN ('bkash_number', 'bkash_account_type', 'store_phone', 'store_email')
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add DELETE policy to password_reset_otps to block all deletes
CREATE POLICY "Block direct OTP delete" 
ON public.password_reset_otps 
FOR DELETE 
USING (false);