
CREATE POLICY "Authenticated users can view available helpers"
ON public.helpers
FOR SELECT
TO authenticated
USING (availability_status IN ('available', 'interviewing'));
