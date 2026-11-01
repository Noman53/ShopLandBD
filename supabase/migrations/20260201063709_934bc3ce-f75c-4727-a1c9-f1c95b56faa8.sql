-- Tighten RLS for password reset OTPs: only backend functions (service role) should access this table.
-- Client-side direct access is blocked.

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous OTP creation" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Allow anonymous OTP verification" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Allow anonymous OTP update" ON public.password_reset_otps;

CREATE POLICY "Block direct OTP insert"
ON public.password_reset_otps
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct OTP select"
ON public.password_reset_otps
FOR SELECT
USING (false);

CREATE POLICY "Block direct OTP update"
ON public.password_reset_otps
FOR UPDATE
USING (false)
WITH CHECK (false);
