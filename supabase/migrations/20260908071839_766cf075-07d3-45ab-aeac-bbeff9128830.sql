CREATE OR REPLACE FUNCTION public.send_conversation_message(conversation uuid, body text, acknowledged_contact_warning boolean DEFAULT false)
 RETURNS messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recipient uuid;
  contains_contact boolean;
  saved_message public.messages%rowtype;
BEGIN
  IF char_length(coalesce(body, '')) > 4000 THEN
    RAISE EXCEPTION 'Message is too long';
  END IF;

  IF coalesce(nullif(trim(body), ''), '') = '' THEN
    RAISE EXCEPTION 'Message body is required';
  END IF;

  IF NOT public.is_conversation_member(conversation) THEN
    RAISE EXCEPTION 'Only conversation members can send messages';
  END IF;

  SELECT cm.profile_id INTO recipient
  FROM public.conversation_members cm
  WHERE cm.conversation_id = conversation AND cm.profile_id <> auth.uid()
  LIMIT 1;

  IF recipient IS NULL THEN
    RAISE EXCEPTION 'Conversation recipient is missing';
  END IF;

  IF NOT public.can_conversation_accept_messages(conversation, auth.uid()) THEN
    RAISE EXCEPTION 'Messages are not permitted in this conversation';
  END IF;

  contains_contact := public.contains_contact_detail(body);
  IF contains_contact AND NOT acknowledged_contact_warning THEN
    RAISE EXCEPTION 'Off-platform communication warning must be acknowledged';
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_profile_id, sender_id, receiver_id, body, content,
    original_body_hash, contact_warning_acknowledged, moderation_state, masked_at, delivered_at
  ) VALUES (
    conversation, auth.uid(), auth.uid(), recipient,
    CASE WHEN contains_contact THEN public.mask_contact_details(body) ELSE body END,
    CASE WHEN contains_contact THEN public.mask_contact_details(body) ELSE body END,
    CASE WHEN contains_contact THEN encode(sha256(body::bytea), 'hex') ELSE NULL END,
    acknowledged_contact_warning,
    CASE WHEN contains_contact THEN 'masked'::public.message_moderation_state ELSE 'clean'::public.message_moderation_state END,
    CASE WHEN contains_contact THEN now() ELSE NULL END,
    now()
  )
  RETURNING * INTO saved_message;

  UPDATE public.conversations SET last_message_at = saved_message.created_at WHERE id = conversation;
  UPDATE public.conversation_members SET archived_at = NULL WHERE conversation_id = conversation;

  PERFORM public.notify_profile(
    recipient,
    'new_message',
    'New message',
    'You have a new message. Open Domestic Hub to reply.',
    'in_app',
    jsonb_build_object('conversationId', conversation, 'messageId', saved_message.id)
  );

  RETURN saved_message;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unlock_worker_profile(worker uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  employer uuid := auth.uid();
  wallet public.credit_wallets%rowtype;
  existing_unlock public.profile_unlocks%rowtype;
  ledger_row public.credit_transactions%rowtype;
  unlock_row public.profile_unlocks%rowtype;
  balance_before integer;
  balance_after integer;
begin
  if employer is null then
    raise exception 'Please sign in before unlocking worker profiles';
  end if;

  if worker is null then
    raise exception 'Worker profile is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(employer::text || ':' || worker::text, 0));

  if worker = employer then
    raise exception 'Employers cannot unlock their own profile';
  end if;

  if not exists (select 1 from public.employer_profiles ep where ep.profile_id = employer) then
    raise exception 'Only employers can unlock worker profiles';
  end if;

  if not exists (
    select 1
    from public.worker_profiles wp
    join public.profiles p on p.id = wp.profile_id
    where wp.profile_id = worker
      and wp.status::text in ('active_available', 'temporarily_unavailable', 'hired', 'not_looking')
      and coalesce(p.status, 'active') = 'active'
      and p.deleted_at is null
  ) then
    raise exception 'Worker profile is not available for unlock';
  end if;

  select * into existing_unlock
  from public.profile_unlocks
  where employer_id = employer
    and helper_id = worker
    and expires_at > now()
  order by expires_at desc
  limit 1;

  wallet := public.ensure_employer_wallet(employer);
  balance_before := wallet.balance;

  if existing_unlock.id is not null then
    return jsonb_build_object(
      'success', true,
      'alreadyUnlocked', true,
      'creditsUsed', 0,
      'balanceBefore', balance_before,
      'balanceAfter', balance_before,
      'creditBalance', balance_before,
      'newBalance', balance_before,
      'unlockId', existing_unlock.id,
      'expiresAt', existing_unlock.expires_at,
      'unlock', to_jsonb(existing_unlock)
    );
  end if;

  ledger_row := public.apply_credit_ledger_entry(
    employer,
    'unlock_debit',
    -1,
    'Worker profile unlock',
    worker,
    employer,
    null
  );

  insert into public.profile_unlocks (
    employer_id,
    helper_id,
    amount_paid,
    bundle_type,
    unlocked_at,
    expires_at
  )
  values (
    employer,
    worker,
    1,
    'credit',
    now(),
    now() + interval '30 days'
  )
  returning * into unlock_row;

  balance_after := ledger_row.balance_after;

  perform public.notify_profile(
    worker,
    'profile_unlock',
    'Your profile was unlocked',
    'An employer unlocked your full profile and can now view your CV/video and message you.',
    'in_app',
    jsonb_build_object('employerId', employer, 'unlockId', unlock_row.id)
  );

  return jsonb_build_object(
    'success', true,
    'alreadyUnlocked', false,
    'creditsUsed', 1,
    'balanceBefore', balance_before,
    'balanceAfter', balance_after,
    'creditBalance', balance_after,
    'newBalance', balance_after,
    'unlockId', unlock_row.id,
    'expiresAt', unlock_row.expires_at,
    'unlock', to_jsonb(unlock_row)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_verified_store_purchase(package_id uuid, platform_name text, provider_transaction text, receipt_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  PERFORM public.notify_profile(
    v_user_id,
    'credit_purchase',
    'Credit purchase received',
    v_package.credits::text || ' credit(s) added. New balance: ' || v_new_balance::text || '.',
    'in_app',
    jsonb_build_object('transactionId', v_transaction_id, 'packageId', v_package.id, 'creditsAdded', v_package.credits)
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
$function$;

-- Preserve execution grants: authenticated users via RPC, service_role for admin/edge functions.
GRANT EXECUTE ON FUNCTION public.send_conversation_message(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(uuid, text, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.send_conversation_message(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_conversation_message(uuid, text, boolean) FROM anon;

GRANT EXECUTE ON FUNCTION public.unlock_worker_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_worker_profile(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.unlock_worker_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_worker_profile(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.record_verified_store_purchase(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_store_purchase(uuid, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.record_verified_store_purchase(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_verified_store_purchase(uuid, text, text, text) FROM anon;