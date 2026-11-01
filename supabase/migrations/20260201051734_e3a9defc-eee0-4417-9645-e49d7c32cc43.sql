-- Create table for storing OTP verification codes
CREATE TABLE public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or phone
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_password_reset_otps_identifier ON public.password_reset_otps(identifier);
CREATE INDEX idx_password_reset_otps_expires_at ON public.password_reset_otps(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for password reset verification (needed during reset flow)
CREATE POLICY "Allow anonymous OTP creation" 
ON public.password_reset_otps 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous OTP verification" 
ON public.password_reset_otps 
FOR SELECT 
USING (true);

CREATE POLICY "Allow anonymous OTP update" 
ON public.password_reset_otps 
FOR UPDATE 
USING (true);

-- Clean up expired OTPs function (runs periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_otps WHERE expires_at < now() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;