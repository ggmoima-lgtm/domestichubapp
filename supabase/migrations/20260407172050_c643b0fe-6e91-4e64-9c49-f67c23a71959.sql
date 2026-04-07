
-- Table to hold tester emails that should receive credits on signup
CREATE TABLE public.tester_credit_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  credits_to_grant integer NOT NULL DEFAULT 4,
  redeemed boolean NOT NULL DEFAULT false,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_credit_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tester emails"
ON public.tester_credit_emails
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to auto-grant credits on profile creation
CREATE OR REPLACE FUNCTION public.grant_tester_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tester record;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_tester FROM public.tester_credit_emails
  WHERE lower(email) = lower(NEW.email) AND redeemed = false;

  IF v_tester IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert wallet
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.user_id, v_tester.credits_to_grant)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = credit_wallets.balance + v_tester.credits_to_grant;

  SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = NEW.user_id;

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (NEW.user_id, v_tester.credits_to_grant, 'bonus', 'Tester welcome credits', v_new_balance);

  -- Mark as redeemed
  UPDATE public.tester_credit_emails SET redeemed = true, redeemed_at = now() WHERE id = v_tester.id;

  RETURN NEW;
END;
$$;

-- Trigger on profile insert
CREATE TRIGGER trg_grant_tester_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_tester_credits();

-- Insert the tester emails
INSERT INTO public.tester_credit_emails (email) VALUES
('umerasghar0123@gmail.com'),
('faizanashrafalvi76@gmail.com'),
('faizanashraf0487@gmail.com'),
('salmanalvi0125@gmail.com'),
('usmanalvi0498@gmail.com'),
('umairasghar0988@gmail.com'),
('rizwanalvi0190@gmail.com'),
('adnanalvi3090@gmail.com'),
('faizanashraf0496@gmail.com'),
('rehanalvi178@gmail.com'),
('hadiasghar580@gmail.com'),
('adnanalvi0498@gmail.com'),
('shahzadmuhammad627@gmail.com'),
('shahzadzain566@gmail.com'),
('shehzynice@gmail.com'),
('ashrafalvi076@gmail.com'),
('aftababbas0766@gmail.com');
