
-- Table to track which employers have unlocked which helper profiles
CREATE TABLE public.profile_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  helper_id UUID NOT NULL REFERENCES public.helpers(id),
  bundle_type TEXT NOT NULL DEFAULT 'single', -- 'bundle_3', 'bundle_5', 'bundle_10'
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_unlocks ENABLE ROW LEVEL SECURITY;

-- Employers can view their own unlocks
CREATE POLICY "Employers can view their own unlocks"
ON public.profile_unlocks
FOR SELECT
USING (auth.uid() = employer_id);

-- Employers can insert their own unlocks
CREATE POLICY "Employers can insert their own unlocks"
ON public.profile_unlocks
FOR INSERT
WITH CHECK (auth.uid() = employer_id);

-- Index for quick lookups
CREATE INDEX idx_profile_unlocks_employer ON public.profile_unlocks(employer_id);
CREATE INDEX idx_profile_unlocks_helper ON public.profile_unlocks(helper_id);
CREATE INDEX idx_profile_unlocks_expires ON public.profile_unlocks(expires_at);
