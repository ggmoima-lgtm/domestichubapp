-- Repair helper_applied_to_employer: the legacy job_posts table was dropped, so this
-- SECURITY DEFINER helper (used by the "Employers can view helpers who applied to
-- their jobs" SELECT policy on public.helpers) was throwing
-- "relation job_posts does not exist" whenever the policy was evaluated.
-- Employer ownership is now resolved through the current jobs table, matching the
-- rebuilt job_applications policies.

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
    JOIN public.jobs j ON j.id = ja.job_id
    WHERE ja.helper_id = p_helper_id
      AND j.employer_profile_id = p_employer_id
  )
$$;

COMMENT ON FUNCTION public.helper_applied_to_employer(uuid, uuid) IS
  'True when the given helper has applied to any job owned by the given employer profile. Resolves ownership via public.jobs after job_posts was dropped.';

-- Preserve the existing locked-down execution model: no public/anon execution,
-- signed-in users and the service role only (the latter is required by the RLS policy).
REVOKE ALL ON FUNCTION public.helper_applied_to_employer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.helper_applied_to_employer(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.helper_applied_to_employer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helper_applied_to_employer(uuid, uuid) TO service_role;