-- 1. Fix credit_wallets: Remove dangerous UPDATE and INSERT policies
DROP POLICY IF EXISTS "Users can update own wallet" ON public.credit_wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.credit_wallets;

-- 2. Fix credit_transactions: Remove dangerous INSERT policy
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;

-- 3. Fix profiles: Remove overly broad SELECT, add admin policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix employer_profiles: Remove overly broad SELECT, add admin policy
DROP POLICY IF EXISTS "Authenticated users can view employer profiles" ON public.employer_profiles;
CREATE POLICY "Admins can view all employer profiles" ON public.employer_profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Fix placements: Remove public SELECT, require authentication
DROP POLICY IF EXISTS "Anyone can view completed placements" ON public.placements;
CREATE POLICY "Authenticated users can view completed placements" ON public.placements
  FOR SELECT TO authenticated
  USING (status = 'completed');
CREATE POLICY "Admins can view all placements" ON public.placements
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Recreate helpers_public view with security_invoker
DROP VIEW IF EXISTS public.helpers_public;
CREATE VIEW public.helpers_public
WITH (security_invoker=on) AS
  SELECT id, full_name, category, experience_years, bio, skills, languages,
    has_work_permit, avatar_url, is_verified, availability_status,
    video_moderation_status, availability, age, gender, nationality,
    intro_video_url, living_arrangement, hourly_rate, available_from,
    video_flagged, created_at, updated_at, user_id
  FROM public.helpers
  WHERE availability_status = ANY (ARRAY['available', 'interviewing']);

-- 7. Create redeem_promo_code RPC (moves all promo logic server-side)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_promo record;
  v_existing record;
  v_new_balance integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes
  WHERE code = upper(p_code) AND is_active = true;

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promo code');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code has expired');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code has reached its usage limit');
  END IF;

  SELECT * INTO v_existing FROM public.promo_redemptions
  WHERE user_id = v_user_id AND promo_code_id = v_promo.id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;

  IF v_promo.bonus_credits > 0 THEN
    INSERT INTO public.credit_wallets (user_id, balance)
    VALUES (v_user_id, v_promo.bonus_credits)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credit_wallets.balance + v_promo.bonus_credits;

    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = v_user_id;

    INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
    VALUES (v_user_id, v_promo.bonus_credits, 'promo', 'Promo code: ' || v_promo.code, v_new_balance);
  END IF;

  INSERT INTO public.promo_redemptions (user_id, promo_code_id) VALUES (v_user_id, v_promo.id);

  UPDATE public.promo_codes SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = v_promo.id;

  RETURN jsonb_build_object('success', true, 'bonus_credits', COALESCE(v_promo.bonus_credits, 0));
END;
$$;

-- 8. Create lookup_email_by_phone RPC for password reset
CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_clean_phone text;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
  
  SELECT email INTO v_email FROM public.profiles
  WHERE phone = v_clean_phone
     OR phone = '+27' || v_clean_phone
     OR phone = '0' || v_clean_phone
  LIMIT 1;

  RETURN v_email;
END;
$$;