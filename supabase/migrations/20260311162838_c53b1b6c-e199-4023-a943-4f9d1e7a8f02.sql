
-- Allow admins to update helpers (e.g. suspend/unsuspend, verify)
CREATE POLICY "Admins can update helpers"
ON public.helpers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all helpers (including suspended)
CREATE POLICY "Admins can view all helpers"
ON public.helpers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user_reports
CREATE POLICY "Admins can view all reports"
ON public.user_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update user_reports (e.g. resolve)
CREATE POLICY "Admins can update reports"
ON public.user_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all invoices for revenue dashboard
CREATE POLICY "Admins can view all invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
