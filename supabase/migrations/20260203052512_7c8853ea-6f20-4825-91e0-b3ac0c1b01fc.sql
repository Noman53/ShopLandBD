-- Add color support to product variants
-- Add columns for color and size chart image to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS size_chart_image text,
ADD COLUMN IF NOT EXISTS has_color_variants boolean DEFAULT false;

-- Create product colors table
CREATE TABLE public.product_colors (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    color_name text NOT NULL,
    color_code text, -- hex code like #FF0000
    color_order integer NOT NULL DEFAULT 0,
    is_available boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add color reference to product_sizes for size-color combinations
ALTER TABLE public.product_sizes 
ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES public.product_colors(id) ON DELETE CASCADE;

-- Enable RLS on product_colors
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_colors
CREATE POLICY "Anyone can view product colors" 
ON public.product_colors 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage product colors" 
ON public.product_colors 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON public.product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_color_id ON public.product_sizes(color_id);

-- Add trigger for updated_at on product_colors
CREATE TRIGGER update_product_colors_updated_at
BEFORE UPDATE ON public.product_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();