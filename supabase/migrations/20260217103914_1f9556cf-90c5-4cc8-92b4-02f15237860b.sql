
-- Fix: Replace overly permissive badge_awards INSERT policy with admin-only
DROP POLICY "System can insert badge awards" ON public.badge_awards;
CREATE POLICY "Admins can insert badge awards" ON public.badge_awards FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
