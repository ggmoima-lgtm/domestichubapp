CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL UNIQUE,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_packages TO anon;
GRANT SELECT ON public.credit_packages TO authenticated;
GRANT ALL ON public.credit_packages TO service_role;

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packages"
  ON public.credit_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Seed / update pricing packages
INSERT INTO public.credit_packages (name, credits, price_cents, currency, is_active)
VALUES
  ('1 credit', 1, 4000, 'ZAR', true),
  ('3 credits', 3, 11000, 'ZAR', true),
  ('5 credits', 5, 18000, 'ZAR', true),
  ('10 credits', 10, 35000, 'ZAR', true),
  ('20 credits', 20, 65000, 'ZAR', true)
ON CONFLICT (credits)
DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Deactivate any legacy sizes not in the current lineup
UPDATE public.credit_packages
SET is_active = false, updated_at = now()
WHERE credits NOT IN (1, 3, 5, 10, 20);