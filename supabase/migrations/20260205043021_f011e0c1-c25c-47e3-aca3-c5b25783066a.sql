-- Add soft delete columns to products, categories, coupons, and flash_sales tables
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.flash_sales 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes for efficient querying of deleted items
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_deleted_at ON public.coupons(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flash_sales_deleted_at ON public.flash_sales(deleted_at) WHERE deleted_at IS NOT NULL;

-- Function to permanently delete items older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_deleted_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete products older than 30 days
  DELETE FROM public.products WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  -- Delete categories older than 30 days
  DELETE FROM public.categories WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  -- Delete coupons older than 30 days
  DELETE FROM public.coupons WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  -- Delete flash sales older than 30 days
  DELETE FROM public.flash_sales WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
END;
$$;