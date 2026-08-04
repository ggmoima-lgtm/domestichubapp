ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS introduction_video_path text,
  ADD COLUMN IF NOT EXISTS introduction_video_url text,
  ADD COLUMN IF NOT EXISTS introduction_photo_path text,
  ADD COLUMN IF NOT EXISTS introduction_photo_url text;

UPDATE public.worker_profiles
SET introduction_video_path = COALESCE(introduction_video_path, intro_video_path),
    introduction_video_url  = COALESCE(introduction_video_url, intro_video_url),
    introduction_photo_path = COALESCE(introduction_photo_path, profile_photo_path),
    introduction_photo_url  = COALESCE(introduction_photo_url, profile_photo_url);

CREATE OR REPLACE FUNCTION public.sync_worker_media_aliases()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.introduction_video_path IS DISTINCT FROM COALESCE(OLD.introduction_video_path, NULL) AND NEW.introduction_video_path IS NOT NULL THEN
    NEW.intro_video_path := NEW.introduction_video_path;
  ELSIF NEW.intro_video_path IS NOT NULL THEN
    NEW.introduction_video_path := NEW.intro_video_path;
  END IF;

  IF NEW.introduction_video_url IS DISTINCT FROM COALESCE(OLD.introduction_video_url, NULL) AND NEW.introduction_video_url IS NOT NULL THEN
    NEW.intro_video_url := NEW.introduction_video_url;
  ELSIF NEW.intro_video_url IS NOT NULL THEN
    NEW.introduction_video_url := NEW.intro_video_url;
  END IF;

  IF NEW.introduction_photo_path IS DISTINCT FROM COALESCE(OLD.introduction_photo_path, NULL) AND NEW.introduction_photo_path IS NOT NULL THEN
    NEW.profile_photo_path := NEW.introduction_photo_path;
  ELSIF NEW.profile_photo_path IS NOT NULL THEN
    NEW.introduction_photo_path := NEW.profile_photo_path;
  END IF;

  IF NEW.introduction_photo_url IS DISTINCT FROM COALESCE(OLD.introduction_photo_url, NULL) AND NEW.introduction_photo_url IS NOT NULL THEN
    NEW.profile_photo_url := NEW.introduction_photo_url;
  ELSIF NEW.profile_photo_url IS NOT NULL THEN
    NEW.introduction_photo_url := NEW.profile_photo_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_worker_media_aliases ON public.worker_profiles;
CREATE TRIGGER trg_sync_worker_media_aliases
BEFORE INSERT OR UPDATE ON public.worker_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_worker_media_aliases();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;