DROP POLICY IF EXISTS "Employers can view their own unlocks" ON public.profile_unlocks;

CREATE POLICY "Employer sees own active unlocks"
  ON public.profile_unlocks FOR SELECT
  USING (
    employer_id = auth.uid()
    AND expires_at > now()
  );