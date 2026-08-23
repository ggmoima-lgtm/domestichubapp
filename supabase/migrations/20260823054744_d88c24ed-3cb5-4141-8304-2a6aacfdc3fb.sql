-- =====================================================================
-- 1. helpers: remove blanket read of available helpers (exposed email/phone)
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view available helpers" ON public.helpers;

-- Recreate the public browse view as a security-definer view (owner postgres
-- bypasses helpers RLS) limited to available helpers and safe columns only.
CREATE OR REPLACE VIEW public.helpers_public AS
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
FROM public.helpers
WHERE availability_status = 'available';

ALTER VIEW public.helpers_public SET (security_invoker = false);

REVOKE SELECT ON public.helpers_public FROM PUBLIC, anon;
GRANT SELECT ON public.helpers_public TO authenticated;
GRANT SELECT ON public.helpers_public TO service_role;

-- =====================================================================
-- 2. worker_profiles: replace open SELECT with scoped policies + safe view
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view worker profiles" ON public.worker_profiles;

CREATE POLICY "Employers can view unlocked worker profiles"
ON public.worker_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profile_unlocks pu
    WHERE pu.employer_id = auth.uid()
      AND pu.helper_id = worker_profiles.profile_id
      AND pu.expires_at > now()
  )
);

CREATE POLICY "Admins can view all worker profiles"
ON public.worker_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view for browse overlays (no private area, no documentation
-- declarations, no storage paths).
CREATE OR REPLACE VIEW public.worker_profiles_public AS
SELECT
  profile_id,
  status,
  public_area,
  biography,
  years_experience,
  expected_salary,
  expected_rate_min,
  expected_rate_max,
  salary_type,
  skills_text,
  languages,
  profile_completion,
  last_availability_confirmed_at,
  searchable_at,
  profile_photo_url,
  intro_video_url,
  introduction_photo_url,
  introduction_video_url,
  created_at,
  updated_at
FROM public.worker_profiles;

ALTER VIEW public.worker_profiles_public SET (security_invoker = false);

REVOKE SELECT ON public.worker_profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.worker_profiles_public TO authenticated;
GRANT SELECT ON public.worker_profiles_public TO service_role;

-- =====================================================================
-- 3. Searchability helper used by availability / membership policies
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_worker_searchable(worker uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.worker_profiles wp
    JOIN public.profiles p ON p.id = wp.profile_id
    WHERE wp.profile_id = worker
      AND wp.status::text IN ('active_available', 'temporarily_unavailable')
      AND wp.searchable_at IS NOT NULL
      AND coalesce(p.status, 'active') = 'active'
      AND p.deleted_at IS NULL
  );
$$;

-- =====================================================================
-- 4. worker_availability: scope SELECT to searchable / unlocked / admin
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view worker availability" ON public.worker_availability;

CREATE POLICY "Authenticated users can view searchable worker availability"
ON public.worker_availability
FOR SELECT
TO authenticated
USING (
  public.is_worker_searchable(worker_profile_id)
  OR EXISTS (
    SELECT 1 FROM public.profile_unlocks pu
    WHERE pu.employer_id = auth.uid()
      AND pu.helper_id = worker_availability.worker_profile_id
      AND pu.expires_at > now()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- =====================================================================
-- 5. worker_category_memberships: scope SELECT to searchable / unlocked / admin
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view category memberships" ON public.worker_category_memberships;

CREATE POLICY "Authenticated users can view searchable category memberships"
ON public.worker_category_memberships
FOR SELECT
TO authenticated
USING (
  public.is_worker_searchable(worker_profile_id)
  OR EXISTS (
    SELECT 1 FROM public.profile_unlocks pu
    WHERE pu.employer_id = auth.uid()
      AND pu.helper_id = worker_category_memberships.worker_profile_id
      AND pu.expires_at > now()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- =====================================================================
-- 6. Harden update_helper_availability with caller authorization
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_helper_availability(p_helper_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    -- the helper themselves
    EXISTS (SELECT 1 FROM public.helpers h WHERE h.id = p_helper_id AND h.user_id = auth.uid())
    -- admins
    OR public.has_role(auth.uid(), 'admin')
    -- an employer with any placement for this helper (hire / unhire flows)
    OR EXISTS (SELECT 1 FROM public.placements pl WHERE pl.helper_id = p_helper_id AND pl.employer_id = auth.uid())
    -- an employer with an active unlock of this helper
    OR EXISTS (SELECT 1 FROM public.profile_unlocks pu WHERE pu.helper_id = p_helper_id AND pu.employer_id = auth.uid() AND pu.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this helper';
  END IF;

  UPDATE public.helpers
  SET availability_status = p_status
  WHERE id = p_helper_id;

  RETURN FOUND;
END;
$$;

-- =====================================================================
-- 7. Lock down SECURITY DEFINER function execution privileges
--    - revoke PUBLIC / anon everywhere (fixes anon access)
--    - grant authenticated only to the intentional app API surface
-- =====================================================================
DO $$
DECLARE
  f record;
  authenticated_api text[] := ARRAY[
    'has_role',
    'is_worker_searchable',
    'is_conversation_member',
    'can_conversation_accept_messages',
    'helper_applied_to_employer',
    'get_helper_ids_for_user',
    'get_hired_helper_ids',
    'search_worker_previews',
    'list_unlocked_worker_profiles',
    'get_worker_unlock_state',
    'unlock_worker_profile',
    'get_employer_wallet_state',
    'redeem_promo_code',
    'deduct_credits_for_unlock',
    'get_employer_names',
    'update_helper_availability',
    'send_conversation_message',
    'mark_conversation_read',
    'start_unlocked_conversation',
    'create_direct_conversation',
    'get_authorized_conversations',
    'lookup_email_by_phone',
    'record_verified_store_purchase'
  ];
BEGIN
  FOR f IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', f.name, f.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', f.name, f.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', f.name, f.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', f.name, f.args);
    IF f.name = ANY(authenticated_api) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', f.name, f.args);
    END IF;
  END LOOP;
END $$;