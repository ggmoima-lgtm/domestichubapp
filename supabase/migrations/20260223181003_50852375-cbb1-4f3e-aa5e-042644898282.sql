
-- Fix: Employers can't see helpers because the SELECT policy is RESTRICTIVE and requires is_verified=true
-- Drop the restrictive policy and replace with a permissive one that shows available/interviewing helpers

DROP POLICY IF EXISTS "Authenticated users can view verified helpers" ON public.helpers;

-- Create a PERMISSIVE policy so authenticated users can see available helpers
CREATE POLICY "Authenticated users can view available helpers"
ON public.helpers
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND availability_status IN ('available', 'interviewing')
);
