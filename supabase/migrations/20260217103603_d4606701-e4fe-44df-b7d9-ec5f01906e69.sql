
-- Badge definitions table
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('trust', 'performance', 'activity')),
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);

-- Seed badges
INSERT INTO public.badges (key, name, description, category, icon) VALUES
  ('phone_verified', 'Phone Verified', 'Phone number has been verified', 'trust', 'phone'),
  ('id_submitted', 'ID Submitted', 'Identity document submitted', 'trust', 'id-card'),
  ('id_verified', 'ID Verified', 'Identity has been verified', 'trust', 'shield-check'),
  ('profile_complete', 'Profile Complete', 'All profile fields filled', 'trust', 'check-circle'),
  ('highly_rated', 'Highly Rated', 'Average rating 4.5+', 'performance', 'star'),
  ('employer_favorite', 'Employer Favorite', 'Saved by 5+ employers', 'performance', 'heart'),
  ('rehired', 'Rehired', 'Hired again by a previous employer', 'performance', 'repeat'),
  ('recently_active', 'Recently Active', 'Active in the last 7 days', 'activity', 'clock'),
  ('fast_responder', 'Fast Responder', 'Responds within 1 hour on average', 'activity', 'zap');

-- Badge awards (junction table)
CREATE TABLE public.badge_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.helpers(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (helper_id, badge_id)
);

ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badge awards" ON public.badge_awards FOR SELECT USING (true);
CREATE POLICY "System can insert badge awards" ON public.badge_awards FOR INSERT WITH CHECK (true);

-- Job posts table
CREATE TABLE public.job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  location text,
  job_type text, -- full-time, part-time
  live_in_out text, -- live-in, live-out
  house_size text,
  family_size text,
  duties text[],
  hours_per_week integer,
  salary_min numeric,
  salary_max numeric,
  negotiable boolean DEFAULT true,
  skills_required text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active job posts" ON public.job_posts FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');
CREATE POLICY "Employers can view their own posts" ON public.job_posts FOR SELECT USING (auth.uid() = employer_id);
CREATE POLICY "Employers can create job posts" ON public.job_posts FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update their own posts" ON public.job_posts FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete their own posts" ON public.job_posts FOR DELETE USING (auth.uid() = employer_id);

-- Job applications
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES public.helpers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, helper_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Helpers can apply to jobs" ON public.job_applications FOR INSERT WITH CHECK (
  helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
);
CREATE POLICY "Helpers can view their applications" ON public.job_applications FOR SELECT USING (
  helper_id IN (SELECT id FROM public.helpers WHERE user_id = auth.uid())
);
CREATE POLICY "Employers can view applications for their jobs" ON public.job_applications FOR SELECT USING (
  job_id IN (SELECT id FROM public.job_posts WHERE employer_id = auth.uid())
);
CREATE POLICY "Employers can update application status" ON public.job_applications FOR UPDATE USING (
  job_id IN (SELECT id FROM public.job_posts WHERE employer_id = auth.uid())
);

-- User reports table
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can submit reports" ON public.user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view their own reports" ON public.user_reports FOR SELECT USING (auth.uid() = reporter_id);

-- Blocked users table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can block others" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can view their blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- User roles table for admin
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update triggers for updated_at
CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
