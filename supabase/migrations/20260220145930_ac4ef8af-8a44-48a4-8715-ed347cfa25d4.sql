
-- Fix: Restrict helpers SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view verified helpers" ON public.helpers;

CREATE POLICY "Authenticated users can view verified helpers"
ON public.helpers FOR SELECT
USING (
  auth.uid() IS NOT NULL AND is_verified = true
);
