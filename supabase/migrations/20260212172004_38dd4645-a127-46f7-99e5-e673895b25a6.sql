
-- Add video moderation fields to helpers table
ALTER TABLE public.helpers
ADD COLUMN video_moderation_status text NOT NULL DEFAULT 'pending',
ADD COLUMN video_flagged boolean NOT NULL DEFAULT false,
ADD COLUMN video_flag_count integer NOT NULL DEFAULT 0,
ADD COLUMN video_moderation_notes text;

-- Create index for moderation queue
CREATE INDEX idx_helpers_video_moderation ON public.helpers (video_moderation_status) WHERE intro_video_url IS NOT NULL;

-- Create video_flags table for employer flagging
CREATE TABLE public.video_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  helper_id uuid NOT NULL REFERENCES public.helpers(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL,
  reason text NOT NULL DEFAULT 'contact_info_in_video',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_flags ENABLE ROW LEVEL SECURITY;

-- Employers can flag videos (one per helper)
CREATE UNIQUE INDEX idx_video_flags_unique ON public.video_flags (helper_id, flagged_by);

CREATE POLICY "Anyone authenticated can flag a video"
ON public.video_flags
FOR INSERT
WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Users can view their own flags"
ON public.video_flags
FOR SELECT
USING (auth.uid() = flagged_by);

-- Function to increment flag count on helpers
CREATE OR REPLACE FUNCTION public.increment_video_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.helpers
  SET video_flag_count = video_flag_count + 1,
      video_flagged = CASE WHEN video_flag_count + 1 >= 3 THEN true ELSE video_flagged END
  WHERE id = NEW.helper_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_video_flag_insert
AFTER INSERT ON public.video_flags
FOR EACH ROW
EXECUTE FUNCTION public.increment_video_flag_count();
