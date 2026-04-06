
CREATE OR REPLACE FUNCTION public.get_employer_names(p_employer_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.user_id, TRIM(COALESCE(p.full_name, '') || ' ' || COALESCE(p.surname, '')) AS display_name
  FROM public.profiles p
  WHERE p.user_id = ANY(p_employer_ids);
$$;
