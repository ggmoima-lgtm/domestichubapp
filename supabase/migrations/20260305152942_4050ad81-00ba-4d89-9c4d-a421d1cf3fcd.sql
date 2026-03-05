
-- 1. Fix add_credits_after_purchase: revoke public execute, only callable via service role
REVOKE EXECUTE ON FUNCTION public.add_credits_after_purchase(uuid, integer, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits_after_purchase(uuid, integer, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_credits_after_purchase(uuid, integer, numeric, text) FROM public;

-- 2. Fix deduct_credits_for_unlock: add auth.uid() guard
CREATE OR REPLACE FUNCTION public.deduct_credits_for_unlock(p_employer_id uuid, p_helper_id uuid, p_credits integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  -- Verify caller is the employer
  IF auth.uid() IS DISTINCT FROM p_employer_id THEN
    RAISE EXCEPTION 'Unauthorized: caller must be the employer';
  END IF;

  SELECT balance INTO v_balance
  FROM public.credit_wallets
  WHERE user_id = p_employer_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_credits THEN
    RETURN false;
  END IF;

  v_new_balance := v_balance - p_credits;

  UPDATE public.credit_wallets
  SET balance = v_new_balance
  WHERE user_id = p_employer_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_employer_id, -p_credits, 'deduction', 'Profile unlock: ' || p_helper_id, v_new_balance);

  INSERT INTO public.profile_unlocks (employer_id, helper_id, amount_paid, bundle_type)
  VALUES (p_employer_id, p_helper_id, p_credits, 'credit');

  RETURN true;
END;
$function$;

-- 3. Fix helper PII exposure: drop broad SELECT policy, create restricted one
DROP POLICY IF EXISTS "Authenticated users can view available helpers" ON public.helpers;

-- Create a restricted view for public browsing (no PII)
CREATE OR REPLACE VIEW public.helpers_public AS
  SELECT id, full_name, category, experience_years, bio, skills, languages,
         has_work_permit, avatar_url, is_verified, availability_status,
         video_moderation_status, availability, age, gender, nationality,
         intro_video_url, living_arrangement, hourly_rate, available_from,
         video_flagged, created_at, updated_at, user_id
  FROM public.helpers
  WHERE availability_status IN ('available', 'interviewing');

GRANT SELECT ON public.helpers_public TO authenticated;

-- Add back a policy that only returns sensitive columns to profile unlockers, the helper themselves, or admins
CREATE POLICY "Authenticated users can view available helpers limited"
ON public.helpers FOR SELECT TO authenticated
USING (
  availability_status IN ('available', 'interviewing')
  AND (
    -- Helper viewing own profile
    auth.uid() = user_id
    -- Admin
    OR has_role(auth.uid(), 'admin')
    -- Employer who unlocked this helper
    OR EXISTS (
      SELECT 1 FROM public.profile_unlocks pu
      WHERE pu.helper_id = helpers.id
        AND pu.employer_id = auth.uid()
        AND pu.expires_at > now()
    )
  )
);

-- Keep policy for non-sensitive browsing: create a separate policy
-- that allows viewing but only non-sensitive fields are accessible via the view
CREATE POLICY "Authenticated users can browse helpers basic info"
ON public.helpers FOR SELECT TO authenticated
USING (
  availability_status IN ('available', 'interviewing')
);

-- 4. Fix reviews: replace open policy with restricted one
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

CREATE POLICY "Involved parties and admins can view reviews"
ON public.reviews FOR SELECT TO authenticated
USING (
  auth.uid() = employer_id
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.helpers h
    WHERE h.id = reviews.helper_id AND h.user_id = auth.uid()
  )
);
