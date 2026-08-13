CREATE OR REPLACE FUNCTION public.record_verified_store_purchase(
  package_id uuid,
  platform_name text,
  provider_transaction text,
  receipt_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_package public.credit_packages%ROWTYPE;
  v_wallet_id uuid;
  v_current_balance integer := 0;
  v_new_balance integer;
  v_invoice_number text;
  v_transaction_id uuid;
  v_existing integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.' USING ERRCODE = 'P0001';
  END IF;

  IF package_id IS NULL OR provider_transaction IS NULL OR receipt_hash IS NULL THEN
    RAISE EXCEPTION 'Missing required payment details.' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency: already processed this receipt?
  SELECT COUNT(*) INTO v_existing
  FROM public.credit_transactions
  WHERE user_id = v_user_id AND reference_id = receipt_hash;

  IF v_existing > 0 THEN
    RAISE EXCEPTION 'This payment has already been processed.' USING ERRCODE = 'P0001';
  END IF;

  -- Look up the active package
  SELECT * INTO v_package
  FROM public.credit_packages
  WHERE id = package_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit package not found or inactive.' USING ERRCODE = 'P0001';
  END IF;

  -- Ensure wallet exists
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.credit_wallets
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance)
    VALUES (v_user_id, 0)
    RETURNING id INTO v_wallet_id;
    v_current_balance := 0;
  END IF;

  v_new_balance := v_current_balance + v_package.credits;

  -- Update wallet
  UPDATE public.credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet_id;

  -- Record ledger transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    balance_after
  )
  VALUES (
    v_user_id,
    v_package.credits,
    'purchase',
    'Paystack credit package: ' || v_package.name,
    receipt_hash,
    v_new_balance
  )
  RETURNING id INTO v_transaction_id;

  -- Record invoice
  v_invoice_number := 'INV-' || upper(substring(gen_random_uuid()::text, 1, 8));
  INSERT INTO public.invoices (
    user_id,
    invoice_number,
    amount,
    tax,
    total,
    credits_purchased,
    payment_method,
    payment_reference,
    status,
    transaction_id
  )
  VALUES (
    v_user_id,
    v_invoice_number,
    v_package.price_cents / 100.0,
    0,
    v_package.price_cents / 100.0,
    v_package.credits,
    'paystack',
    provider_transaction,
    'paid',
    v_transaction_id::text
  );

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'invoice_number', v_invoice_number,
    'credits_added', v_package.credits,
    'balance', v_new_balance,
    'package', jsonb_build_object(
      'id', v_package.id,
      'name', v_package.name,
      'credits', v_package.credits,
      'price_cents', v_package.price_cents
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_verified_store_purchase(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_store_purchase(uuid, text, text, text) TO service_role;