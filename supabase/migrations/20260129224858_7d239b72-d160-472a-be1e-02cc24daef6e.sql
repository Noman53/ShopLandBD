-- Drop the old constraint and add a new one with 'paid' included
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status = ANY (ARRAY['pending'::text, 'verified'::text, 'paid'::text, 'failed'::text]));