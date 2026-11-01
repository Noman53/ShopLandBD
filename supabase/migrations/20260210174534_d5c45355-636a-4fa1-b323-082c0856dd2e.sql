
-- Free delivery rules table
CREATE TABLE public.free_delivery_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'selected')),
  delivery_area TEXT NOT NULL DEFAULT 'both' CHECK (delivery_area IN ('dhaka', 'outside_dhaka', 'both')),
  trigger_type TEXT NOT NULL DEFAULT 'min_amount' CHECK (trigger_type IN ('min_amount', 'coupon')),
  min_order_amount NUMERIC DEFAULT 0,
  coupon_code TEXT DEFAULT NULL,
  product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_delivery_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active free delivery rules"
ON public.free_delivery_rules
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage free delivery rules"
ON public.free_delivery_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
