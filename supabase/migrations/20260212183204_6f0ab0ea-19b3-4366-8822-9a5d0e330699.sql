
-- Create saved_helpers table
CREATE TABLE public.saved_helpers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  helper_id UUID NOT NULL REFERENCES public.helpers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employer_id, helper_id)
);

-- Enable RLS
ALTER TABLE public.saved_helpers ENABLE ROW LEVEL SECURITY;

-- Employers can view their saved helpers
CREATE POLICY "Employers can view their saved helpers"
ON public.saved_helpers FOR SELECT
USING (auth.uid() = employer_id);

-- Employers can save helpers
CREATE POLICY "Employers can save helpers"
ON public.saved_helpers FOR INSERT
WITH CHECK (auth.uid() = employer_id);

-- Employers can unsave helpers
CREATE POLICY "Employers can unsave helpers"
ON public.saved_helpers FOR DELETE
USING (auth.uid() = employer_id);
