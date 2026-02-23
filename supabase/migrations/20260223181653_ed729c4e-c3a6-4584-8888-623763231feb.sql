
-- Fix helper visibility: Convert all SELECT policies to PERMISSIVE (OR logic)
-- Drop all existing restrictive SELECT policies on helpers
DROP POLICY IF EXISTS "Authenticated users can view available helpers" ON public.helpers;
DROP POLICY IF EXISTS "Employers can view helpers who applied to their jobs" ON public.helpers;
DROP POLICY IF EXISTS "Helpers can view their own profile" ON public.helpers;

-- Recreate as PERMISSIVE policies (default is permissive, OR logic)
CREATE POLICY "Helpers can view their own profile"
ON public.helpers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view available helpers"
ON public.helpers
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND availability_status IN ('available', 'interviewing')
);

CREATE POLICY "Employers can view helpers who applied to their jobs"
ON public.helpers
FOR SELECT
USING (helper_applied_to_employer(id, auth.uid()));
