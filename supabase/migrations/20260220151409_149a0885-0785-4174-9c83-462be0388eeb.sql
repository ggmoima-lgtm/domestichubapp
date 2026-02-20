
-- Add missing columns to helpers table
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS id_document_url text;
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS references_info jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS living_arrangement text;

-- Create avatars storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Create helper-documents storage bucket for ID docs
INSERT INTO storage.buckets (id, name, public) VALUES ('helper-documents', 'helper-documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for helper-documents (private)
CREATE POLICY "Helpers can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'helper-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Helpers can view their own documents" ON storage.objects FOR SELECT USING (bucket_id = 'helper-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT USING (bucket_id = 'helper-documents' AND public.has_role(auth.uid(), 'admin'));

-- Create promo_codes table for monetization
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer DEFAULT 0,
  bonus_credits integer DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active promo codes" ON public.promo_codes FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create promo_redemptions table
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promo_code_id uuid REFERENCES public.promo_codes(id) NOT NULL,
  redeemed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemptions" ON public.promo_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can redeem codes" ON public.promo_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create audit_logs table for admin
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
