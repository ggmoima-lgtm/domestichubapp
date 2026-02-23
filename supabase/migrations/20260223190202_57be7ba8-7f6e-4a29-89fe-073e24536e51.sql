
-- Fix infinite recursion: placements -> helpers -> placements

-- 1. Create a SECURITY DEFINER function to check if a user is a helper
CREATE OR REPLACE FUNCTION public.get_helper_ids_for_user(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.helpers WHERE user_id = p_user_id;
$$;

-- 2. Create a SECURITY DEFINER function to check hired helpers for an employer
CREATE OR REPLACE FUNCTION public.get_hired_helper_ids(p_employer_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT helper_id FROM public.placements WHERE employer_id = p_employer_id AND status = 'active';
$$;

-- 3. Drop the problematic policies
DROP POLICY IF EXISTS "Helpers can view placements involving them" ON public.placements;
DROP POLICY IF EXISTS "Employers can view their hired helpers" ON public.helpers;

-- 4. Recreate with SECURITY DEFINER functions (no cross-table references)
CREATE POLICY "Helpers can view placements involving them"
ON public.placements
FOR SELECT
USING (helper_id IN (SELECT public.get_helper_ids_for_user(auth.uid())));

CREATE POLICY "Employers can view their hired helpers"
ON public.helpers
FOR SELECT
USING (id IN (SELECT public.get_hired_helper_ids(auth.uid())));
