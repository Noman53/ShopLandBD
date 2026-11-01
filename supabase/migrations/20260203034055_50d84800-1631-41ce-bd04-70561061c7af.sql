-- Create product_sizes table for wearable products
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  size_order INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  price_adjustment NUMERIC DEFAULT 0,
  measurements JSONB DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, size_name)
);

-- Add is_wearable column to products to indicate size-enabled products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_wearable BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- Create policies for product_sizes
CREATE POLICY "Anyone can view product sizes" 
ON public.product_sizes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage product sizes" 
ON public.product_sizes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_product_sizes_updated_at
BEFORE UPDATE ON public.product_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_product_sizes_product_id ON public.product_sizes(product_id);

-- Add constraint to ensure stock is non-negative
ALTER TABLE public.product_sizes ADD CONSTRAINT product_sizes_stock_non_negative CHECK (stock_quantity >= 0);