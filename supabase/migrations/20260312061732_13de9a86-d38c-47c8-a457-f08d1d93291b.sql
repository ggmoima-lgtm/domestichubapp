
-- 1. Fix placements: restrict completed placements to involved parties only
DROP POLICY IF EXISTS "Authenticated users can view completed placements" ON public.placements;

CREATE POLICY "Involved parties can view completed placements"
ON public.placements
FOR SELECT
TO authenticated
USING (
  status = 'completed'
  AND (
    auth.uid() = employer_id
    OR helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
  )
);

-- 2. Fix helpers: create a separate table for sensitive fields
CREATE TABLE IF NOT EXISTS public.helper_sensitive_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.helpers(id) ON DELETE CASCADE UNIQUE,
  id_document_url text,
  references_info jsonb DEFAULT '[]'::jsonb,
  verification_reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.helper_sensitive_data ENABLE ROW LEVEL SECURITY;

-- Only the helper themselves and admins can view sensitive data
CREATE POLICY "Helpers can view own sensitive data"
ON public.helper_sensitive_data
FOR SELECT
TO authenticated
USING (
  helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all sensitive data"
ON public.helper_sensitive_data
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Helpers can insert own sensitive data"
ON public.helper_sensitive_data
FOR INSERT
TO authenticated
WITH CHECK (
  helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
);

CREATE POLICY "Helpers can update own sensitive data"
ON public.helper_sensitive_data
FOR UPDATE
TO authenticated
USING (
  helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update sensitive data"
ON public.helper_sensitive_data
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing data
INSERT INTO public.helper_sensitive_data (helper_id, id_document_url, references_info, verification_reference_id)
SELECT id, id_document_url, references_info, verification_reference_id
FROM public.helpers
WHERE id_document_url IS NOT NULL OR references_info IS NOT NULL OR verification_reference_id IS NOT NULL
ON CONFLICT (helper_id) DO NOTHING;

-- Remove sensitive columns from helpers table
ALTER TABLE public.helpers DROP COLUMN IF EXISTS id_document_url;
ALTER TABLE public.helpers DROP COLUMN IF EXISTS references_info;
ALTER TABLE public.helpers DROP COLUMN IF EXISTS verification_reference_id;
