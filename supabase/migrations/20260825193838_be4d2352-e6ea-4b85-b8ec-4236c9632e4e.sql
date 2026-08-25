
CREATE TABLE IF NOT EXISTS public.profile_pin_credentials (
  profile_id uuid PRIMARY KEY,
  pin_hash text NOT NULL,
  salt text NOT NULL,
  iterations integer NOT NULL DEFAULT 100000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.profile_pin_credentials TO service_role;
ALTER TABLE public.profile_pin_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pin_auth_attempts (
  phone_e164 text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pin_auth_attempts TO service_role;
ALTER TABLE public.pin_auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  phone_e164 text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events (created_at DESC);
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
