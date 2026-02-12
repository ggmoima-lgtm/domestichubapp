
-- Drop the old check constraint on availability_status
ALTER TABLE public.helpers DROP CONSTRAINT IF EXISTS helpers_availability_status_check;

-- Add expanded status values
ALTER TABLE public.helpers ADD CONSTRAINT helpers_availability_status_check 
  CHECK (availability_status IN ('available', 'interviewing', 'hired_platform', 'hired_external', 'unavailable', 'suspended'));

-- Update existing 'unavailable' values to 'hired_platform' for clarity
UPDATE public.helpers SET availability_status = 'available' WHERE availability_status = 'available';

-- Add work history fields to placements
ALTER TABLE public.placements ADD COLUMN employer_name TEXT;
ALTER TABLE public.placements ADD COLUMN job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'live-in', 'live-out'));
ALTER TABLE public.placements ADD COLUMN job_category TEXT;
ALTER TABLE public.placements ADD COLUMN early_termination BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.placements ADD COLUMN terminated_by TEXT CHECK (terminated_by IN ('employer', 'helper', NULL));

-- Add "would you hire again?" to reviews
ALTER TABLE public.reviews ADD COLUMN would_hire_again BOOLEAN;

-- Allow helpers to view placements for their profile (public work history)
CREATE POLICY "Anyone can view completed placements" ON public.placements FOR SELECT USING (status = 'completed');
