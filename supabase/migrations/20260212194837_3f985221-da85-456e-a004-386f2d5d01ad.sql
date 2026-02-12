
ALTER TABLE public.employer_profiles
ADD COLUMN full_name text,
ADD COLUMN category text,
ADD COLUMN availability text[] DEFAULT '{}'::text[],
ADD COLUMN custom_notes text;
