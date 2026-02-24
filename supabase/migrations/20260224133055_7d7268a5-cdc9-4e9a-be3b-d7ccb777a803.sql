
-- Add transaction_id column to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS transaction_id text;

-- Create invoice-pdfs storage bucket for secure PDF storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Only the invoice owner can download their PDFs
CREATE POLICY "Users can view their own invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role inserts PDFs (edge function uses service role)
CREATE POLICY "Service can upload invoice PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice-pdfs');
