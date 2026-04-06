-- 1. Fix helpers email/phone exposure: restrict broad SELECT to only unlocked profiles
DROP POLICY IF EXISTS "Authenticated users can view available helpers" ON public.helpers;

-- Create a new policy: authenticated users can view helpers they've unlocked
CREATE POLICY "Employers can view unlocked helpers"
ON public.helpers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profile_unlocks pu
    WHERE pu.helper_id = helpers.id
      AND pu.employer_id = auth.uid()
      AND pu.expires_at > now()
  )
);

-- 2. Fix invoice-pdfs unrestricted upload: remove open policy, service role doesn't need it
DROP POLICY IF EXISTS "Service can upload invoice PDFs" ON storage.objects;

-- 3. Fix lookup_email_by_phone: add auth guard
CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_clean_phone text;
  v_user_id uuid;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
  
  SELECT user_id, email INTO v_user_id, v_email FROM public.profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = v_clean_phone
  LIMIT 1;

  IF v_email IS NOT NULL AND v_email != '' THEN
    RETURN v_email;
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    RETURN v_email;
  END IF;

  SELECT email INTO v_email FROM auth.users 
  WHERE email = v_clean_phone || '@helper.domestichub.app';
  
  RETURN v_email;
END;
$function$;

-- Also revoke anon access
REVOKE EXECUTE ON FUNCTION public.lookup_email_by_phone(text) FROM anon;