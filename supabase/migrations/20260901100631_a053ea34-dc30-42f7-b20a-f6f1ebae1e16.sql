
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid NOT NULL REFERENCES public.employer_profiles(profile_id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.worker_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  employment_type text,
  work_arrangement text,
  public_area text,
  private_exact_address text,
  start_date date,
  salary_min numeric,
  salary_max numeric,
  duties text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers manage own jobs"
ON public.jobs FOR ALL TO authenticated
USING (employer_profile_id = auth.uid())
WITH CHECK (employer_profile_id = auth.uid());

CREATE POLICY "Authenticated users can view published jobs"
ON public.jobs FOR SELECT TO authenticated
USING (status = 'published');

CREATE TABLE IF NOT EXISTS public.job_category_details (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_category_details TO authenticated;
GRANT ALL ON public.job_category_details TO service_role;

ALTER TABLE public.job_category_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers manage own job category details"
ON public.job_category_details FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_profile_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_profile_id = auth.uid()));

CREATE POLICY "Authenticated users can view published job details"
ON public.job_category_details FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.status = 'published'));
