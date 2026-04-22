DROP POLICY IF EXISTS "Employers can view unlocked helpers" ON public.helpers;

CREATE POLICY "Employer reads unlocked helpers"
  ON public.helpers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_unlocks
      WHERE profile_unlocks.helper_id = helpers.id
        AND profile_unlocks.employer_id = auth.uid()
        AND profile_unlocks.expires_at > now()
    )
  );