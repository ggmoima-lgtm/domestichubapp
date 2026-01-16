-- Create helpers table for registration
CREATE TABLE public.helpers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  bio TEXT,
  availability TEXT,
  skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  has_work_permit BOOLEAN DEFAULT false,
  intro_video_url TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.helpers ENABLE ROW LEVEL SECURITY;

-- Policies for helpers table
CREATE POLICY "Helpers can view their own profile"
ON public.helpers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified helpers"
ON public.helpers
FOR SELECT
USING (is_verified = true);

CREATE POLICY "Helpers can insert their own profile"
ON public.helpers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Helpers can update their own profile"
ON public.helpers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Helpers can delete their own profile"
ON public.helpers
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_helpers_updated_at
BEFORE UPDATE ON public.helpers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for intro videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('helper-videos', 'helper-videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/webm']);

-- Storage policies for helper videos
CREATE POLICY "Anyone can view helper videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'helper-videos');

CREATE POLICY "Authenticated users can upload helper videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'helper-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'helper-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'helper-videos' AND auth.uid()::text = (storage.foldername(name))[1]);