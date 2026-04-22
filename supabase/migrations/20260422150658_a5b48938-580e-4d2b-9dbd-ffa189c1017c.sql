
-- 1. OTP codes: explicit SELECT policy (users read only their own)
CREATE POLICY "Users read own OTP"
  ON public.otp_codes FOR SELECT
  USING (user_id = auth.uid());

-- 2. Helper videos: replace permissive INSERT with path-scoped check
DROP POLICY IF EXISTS "Authenticated users can upload helper videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload helper videos" ON storage.objects;
DROP POLICY IF EXISTS "Helpers can upload videos" ON storage.objects;

CREATE POLICY "Helper videos scoped upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'helper-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Audit logs: remove user-forgeable insert; only SECURITY DEFINER / service role may insert
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- 5. Invoice PDFs: scoped INSERT, owner-only DELETE, no updates
CREATE POLICY "Owner uploads invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner deletes invoices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoice-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "No invoice updates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoice-pdfs' AND false);
