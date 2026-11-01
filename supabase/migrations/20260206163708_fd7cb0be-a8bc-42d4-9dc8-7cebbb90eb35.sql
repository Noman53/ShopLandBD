
-- Drop the old unique constraint that only covers (product_id, size_name)
-- This prevents multiple color entries with size_name='Default' for color-only products
ALTER TABLE public.product_sizes DROP CONSTRAINT IF EXISTS product_sizes_product_id_size_name_key;

-- Add new unique constraint that includes color_id
-- This allows multiple "Default" size entries per product as long as each has a different color_id
ALTER TABLE public.product_sizes ADD CONSTRAINT product_sizes_product_id_size_name_color_id_key 
  UNIQUE (product_id, size_name, color_id);
