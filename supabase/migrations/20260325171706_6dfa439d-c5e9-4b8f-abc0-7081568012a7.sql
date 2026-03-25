
CREATE OR REPLACE FUNCTION public.update_helper_availability(p_helper_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.helpers
  SET availability_status = p_status
  WHERE id = p_helper_id;
  
  RETURN FOUND;
END;
$$;
