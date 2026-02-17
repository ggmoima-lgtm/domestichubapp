
-- Allow admins to delete badge awards (for auto-revoke engine)
CREATE POLICY "Admins can delete badge awards"
ON public.badge_awards
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
