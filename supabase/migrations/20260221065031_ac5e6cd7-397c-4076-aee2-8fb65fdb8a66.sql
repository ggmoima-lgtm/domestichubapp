-- Allow employers to see helpers who applied to their job posts
CREATE POLICY "Employers can view helpers who applied to their jobs"
ON public.helpers
FOR SELECT
USING (
  id IN (
    SELECT ja.helper_id 
    FROM public.job_applications ja
    JOIN public.job_posts jp ON jp.id = ja.job_id
    WHERE jp.employer_id = auth.uid()
  )
);