
-- Fix the SECURITY DEFINER view issue: recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.helpers_public;

CREATE VIEW public.helpers_public 
WITH (security_invoker = true)
AS
  SELECT id, full_name, category, experience_years, bio, skills, languages,
         has_work_permit, avatar_url, is_verified, availability_status,
         video_moderation_status, availability, age, gender, nationality,
         intro_video_url, living_arrangement, hourly_rate, available_from,
         video_flagged, created_at, updated_at, user_id
  FROM public.helpers
  WHERE availability_status IN ('available', 'interviewing');

GRANT SELECT ON public.helpers_public TO authenticated;

-- Remove the redundant broad policy that defeats the limited one
DROP POLICY IF EXISTS "Authenticated users can browse helpers basic info" ON public.helpers;
