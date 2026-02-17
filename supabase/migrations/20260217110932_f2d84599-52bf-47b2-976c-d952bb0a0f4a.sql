
-- ============================================
-- 1. CREDIT WALLET SYSTEM
-- ============================================

-- Credit wallet per employer
CREATE TABLE public.credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.credit_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.credit_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.credit_wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_credit_wallets_updated_at
  BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Credit transactions ledger
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL, -- 'purchase', 'deduction', 'refund', 'expiry'
  description text,
  reference_id text,
  balance_after integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. INVOICE SYSTEM
-- ============================================

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  credits_purchased integer NOT NULL DEFAULT 0,
  payment_method text,
  payment_reference text,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. TERMS ACCEPTANCE TRACKING
-- ============================================

CREATE TABLE public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, terms_version)
);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptances" ON public.terms_acceptances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acceptances" ON public.terms_acceptances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. PUSH NOTIFICATION TOKENS
-- ============================================

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. NOTIFICATION PREFERENCES
-- ============================================

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  messages boolean NOT NULL DEFAULT true,
  interviews boolean NOT NULL DEFAULT true,
  profile_unlocks boolean NOT NULL DEFAULT true,
  hire_updates boolean NOT NULL DEFAULT true,
  reviews boolean NOT NULL DEFAULT true,
  credits boolean NOT NULL DEFAULT true,
  admin_actions boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. CREDIT WALLET FUNCTIONS
-- ============================================

-- Function to deduct credits and create unlock record
CREATE OR REPLACE FUNCTION public.deduct_credits_for_unlock(
  p_employer_id uuid,
  p_helper_id uuid,
  p_credits integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_balance
  FROM public.credit_wallets
  WHERE user_id = p_employer_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_credits THEN
    RETURN false;
  END IF;

  v_new_balance := v_balance - p_credits;

  -- Deduct credits
  UPDATE public.credit_wallets
  SET balance = v_new_balance
  WHERE user_id = p_employer_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_employer_id, -p_credits, 'deduction', 'Profile unlock: ' || p_helper_id, v_new_balance);

  -- Create unlock record
  INSERT INTO public.profile_unlocks (employer_id, helper_id, amount_paid, bundle_type)
  VALUES (p_employer_id, p_helper_id, p_credits, 'credit');

  RETURN true;
END;
$$;

-- Function to add credits after purchase
CREATE OR REPLACE FUNCTION public.add_credits_after_purchase(
  p_user_id uuid,
  p_credits integer,
  p_amount numeric,
  p_payment_ref text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_invoice_number text;
BEGIN
  -- Upsert wallet
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = credit_wallets.balance + p_credits;

  SELECT balance INTO v_new_balance
  FROM public.credit_wallets WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (p_user_id, p_credits, 'purchase', p_credits || ' credits purchased', p_payment_ref, v_new_balance);

  -- Generate invoice
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.invoices (user_id, invoice_number, amount, tax, total, credits_purchased, payment_method, payment_reference)
  VALUES (p_user_id, v_invoice_number, p_amount, p_amount * 0.15, p_amount * 1.15, p_credits, 'paystack', p_payment_ref);

  RETURN true;
END;
$$;
