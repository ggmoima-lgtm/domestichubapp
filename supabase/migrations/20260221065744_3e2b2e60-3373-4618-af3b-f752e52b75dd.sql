
-- Drop the recursive policy
DROP POLICY IF EXISTS "Employers can view helpers who applied to their jobs" ON public.helpers;

-- Create a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.helper_applied_to_employer(p_helper_id uuid, p_employer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_applications ja
    JOIN public.job_posts jp ON jp.id = ja.job_id
    WHERE ja.helper_id = p_helper_id
      AND jp.employer_id = p_employer_id
  )
$$;

-- Recreate policy using the function
CREATE POLICY "Employers can view helpers who applied to their jobs"
ON public.helpers
FOR SELECT
USING (public.helper_applied_to_employer(id, auth.uid()));
