
-- Clean up orphaned profile
DELETE FROM public.profiles WHERE user_id = '96eeba95-3082-4944-8fe1-8b9a9d85b7a8';

-- Update RPC to also check auth.users for email (helpers use generated emails)
CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_clean_phone text;
  v_user_id uuid;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
  
  -- First try to find user_id from profiles by phone
  SELECT user_id, email INTO v_user_id, v_email FROM public.profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = v_clean_phone
     OR regexp_replace(phone, '\D', '', 'g') = v_clean_phone
  LIMIT 1;

  -- If we found a profile with an email, return it
  IF v_email IS NOT NULL AND v_email != '' THEN
    RETURN v_email;
  END IF;

  -- If we found a profile but no email, look up the auth email
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    RETURN v_email;
  END IF;

  -- Also check for generated helper emails directly in auth
  SELECT email INTO v_email FROM auth.users 
  WHERE email = v_clean_phone || '@helper.domestichub.app';
  
  RETURN v_email;
END;
$$;
