
-- Allow employers to view helpers they have active placements with
CREATE POLICY "Employers can view their hired helpers"
ON public.helpers
FOR SELECT
USING (
  id IN (
    SELECT p.helper_id FROM public.placements p
    WHERE p.employer_id = auth.uid() AND p.status = 'active'
  )
);
