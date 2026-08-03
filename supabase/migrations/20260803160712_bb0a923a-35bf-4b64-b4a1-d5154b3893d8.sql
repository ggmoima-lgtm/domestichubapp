-- === profiles: new columns + relax legacy NOT NULLs ===
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_role text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_terms_version text,
  ADD COLUMN IF NOT EXISTS accepted_privacy_version text,
  ADD COLUMN IF NOT EXISTS accepted_acceptable_use_version text,
  ADD COLUMN IF NOT EXISTS age_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS role_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique_lower ON public.profiles (lower(email)) WHERE email IS NOT NULL AND email <> '';

-- === employer_profiles: new columns ===
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS public_area text,
  ADD COLUMN IF NOT EXISTS private_exact_address text;

UPDATE public.employer_profiles SET profile_id = user_id WHERE profile_id IS NULL;
ALTER TABLE public.employer_profiles ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employer_profiles_profile_id_key ON public.employer_profiles (profile_id);

-- === worker_categories ===
CREATE TABLE IF NOT EXISTS public.worker_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.worker_categories TO anon, authenticated;
GRANT ALL ON public.worker_categories TO service_role;
ALTER TABLE public.worker_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active worker categories" ON public.worker_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage worker categories" ON public.worker_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.worker_categories (slug, name) VALUES
  ('domestic_cleaning', 'Domestic Cleaning'),
  ('childcare', 'Childcare / Nanny'),
  ('gardening', 'Gardening'),
  ('elderly_care', 'Elderly Care'),
  ('cooking', 'Cooking'),
  ('driver', 'Driver'),
  ('security', 'Security'),
  ('handyman', 'Handyman')
ON CONFLICT (slug) DO NOTHING;

-- === worker_profiles ===
CREATE TABLE IF NOT EXISTS public.worker_profiles (
  profile_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending_completion',
  public_area text,
  private_exact_area text,
  biography text,
  years_experience integer NOT NULL DEFAULT 0,
  expected_salary text,
  skills_text text,
  languages text[] NOT NULL DEFAULT '{}',
  profile_completion integer NOT NULL DEFAULT 0,
  documentation_declaration text,
  documentation_declared_at timestamptz,
  documentation_terms_version text,
  last_availability_confirmed_at timestamptz,
  searchable_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers manage own worker profile" ON public.worker_profiles FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Authenticated users can view worker profiles" ON public.worker_profiles FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_worker_profiles_updated_at BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === worker_availability ===
CREATE TABLE IF NOT EXISTS public.worker_availability (
  worker_profile_id uuid PRIMARY KEY REFERENCES public.worker_profiles(profile_id) ON DELETE CASCADE,
  employment_types text[] NOT NULL DEFAULT '{}',
  areas_willing_to_work text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_availability TO authenticated;
GRANT ALL ON public.worker_availability TO service_role;
ALTER TABLE public.worker_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers manage own availability" ON public.worker_availability FOR ALL TO authenticated
  USING (auth.uid() = worker_profile_id) WITH CHECK (auth.uid() = worker_profile_id);
CREATE POLICY "Authenticated users can view worker availability" ON public.worker_availability FOR SELECT TO authenticated USING (true);

-- === worker_category_memberships ===
CREATE TABLE IF NOT EXISTS public.worker_category_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id uuid NOT NULL REFERENCES public.worker_profiles(profile_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.worker_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_profile_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_category_memberships TO authenticated;
GRANT ALL ON public.worker_category_memberships TO service_role;
ALTER TABLE public.worker_category_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers manage own category memberships" ON public.worker_category_memberships FOR ALL TO authenticated
  USING (auth.uid() = worker_profile_id) WITH CHECK (auth.uid() = worker_profile_id);
CREATE POLICY "Authenticated users can view category memberships" ON public.worker_category_memberships FOR SELECT TO authenticated USING (true);

-- === onboarding_sessions ===
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  profile_id uuid PRIMARY KEY,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  current_step text,
  completed_steps text[] NOT NULL DEFAULT '{}',
  draft jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT ALL ON public.onboarding_sessions TO service_role;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own onboarding session" ON public.onboarding_sessions FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Admins can view onboarding sessions" ON public.onboarding_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === ensure_employer_wallet ===
CREATE OR REPLACE FUNCTION public.ensure_employer_wallet(employer uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (employer, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;