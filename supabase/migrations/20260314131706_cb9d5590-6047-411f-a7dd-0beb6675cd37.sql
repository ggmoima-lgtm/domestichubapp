
-- Drop the restrictive policy that blocks employers from browsing
DROP POLICY IF EXISTS "Authenticated users can view available helpers limited" ON public.helpers;

-- Create a new policy that allows all authenticated users to see available/interviewing helpers
CREATE POLICY "Authenticated users can view available helpers"
ON public.helpers FOR SELECT
TO authenticated
USING (
  availability_status IN ('available', 'interviewing')
);
