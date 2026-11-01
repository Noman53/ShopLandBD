-- Add flash_sales table
CREATE TABLE public.flash_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Flash sale products junction table
CREATE TABLE public.flash_sale_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flash_sale_id UUID NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flash_sale_id, product_id)
);

-- Enable RLS
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sale_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for flash_sales
CREATE POLICY "Admins can manage flash sales" 
ON public.flash_sales 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active flash sales" 
ON public.flash_sales 
FOR SELECT 
USING (is_active = true);

-- RLS policies for flash_sale_products
CREATE POLICY "Admins can manage flash sale products" 
ON public.flash_sale_products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view flash sale products" 
ON public.flash_sale_products 
FOR SELECT 
USING (true);

-- Insert default delivery charge settings
INSERT INTO public.store_settings (key, value) VALUES 
  ('delivery_charge_dhaka', '70'),
  ('delivery_charge_outside_dhaka', '120')
ON CONFLICT (key) DO NOTHING;