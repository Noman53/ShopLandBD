-- Enable realtime for product_sizes table to sync variant stock updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_sizes;