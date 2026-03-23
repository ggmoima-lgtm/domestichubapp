ALTER TABLE public.helpers 
ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'domestic',
ADD COLUMN IF NOT EXISTS skills_domestic text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS skills_gardening text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS has_tools boolean DEFAULT false;