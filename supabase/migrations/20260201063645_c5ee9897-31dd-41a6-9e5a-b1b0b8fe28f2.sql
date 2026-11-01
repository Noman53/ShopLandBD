-- Add reset token columns to support multi-step password reset (verify -> reset)
ALTER TABLE public.password_reset_otps
  ADD COLUMN IF NOT EXISTS reset_token text,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamp with time zone;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_identifier
  ON public.password_reset_otps (identifier);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_reset_token
  ON public.password_reset_otps (reset_token);
