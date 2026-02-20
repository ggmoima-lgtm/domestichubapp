-- Add verification columns to helpers table for SimplyID integration
ALTER TABLE public.helpers 
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verification_reference_id text,
ADD COLUMN IF NOT EXISTS verification_date timestamp with time zone;

-- Create index for verification status lookups
CREATE INDEX IF NOT EXISTS idx_helpers_verification_status ON public.helpers(verification_status);