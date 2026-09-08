CREATE TABLE IF NOT EXISTS public.worker_skills (
  worker_profile_id uuid NOT NULL REFERENCES public.worker_profiles(profile_id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_profile_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_skills_worker_profile ON public.worker_skills(worker_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_skills TO authenticated;
GRANT ALL ON public.worker_skills TO service_role;

ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workers_manage_own_skills" ON public.worker_skills;

CREATE POLICY "workers_manage_own_skills" ON public.worker_skills
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = worker_profile_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = worker_profile_id AND p.user_id = auth.uid()
  )
);