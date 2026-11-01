
-- Product Q&A table
CREATE TABLE public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text DEFAULT NULL,
  answered_at timestamp with time zone DEFAULT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view visible questions
CREATE POLICY "Anyone can view visible questions"
  ON public.product_questions FOR SELECT
  USING (is_visible = true);

-- Authenticated users can insert their own questions
CREATE POLICY "Users can insert own questions"
  ON public.product_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own questions (including hidden)
CREATE POLICY "Users can view own questions"
  ON public.product_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all questions
CREATE POLICY "Admins can manage questions"
  ON public.product_questions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_product_questions_updated_at
  BEFORE UPDATE ON public.product_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
