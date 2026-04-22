-- Recreate helpers_public view as security_invoker so RLS on the underlying
-- helpers table is enforced based on the querying user, not the view owner.
-- Excludes sensitive contact fields (phone, email) entirely.

DROP VIEW IF EXISTS public.helpers_public;

CREATE VIEW public.helpers_public
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  full_name,
  category,
  service_type,
  age,
  gender,
  nationality,
  living_arrangement,
  bio,
  experience_years,
  hourly_rate,
  availability,
  availability_status,
  available_from,
  skills,
  skills_domestic,
  skills_gardening,
  has_tools,
  has_work_permit,
  languages,
  avatar_url,
  intro_video_url,
  is_verified,
  verification_status,
  video_flagged,
  video_moderation_status,
  location,
  created_at,
  updated_at
FROM public.helpers;

GRANT SELECT ON public.helpers_public TO authenticated;