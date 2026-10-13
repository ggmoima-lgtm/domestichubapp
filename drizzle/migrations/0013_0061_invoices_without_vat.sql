create or replace function public.add_credits_after_purchase(p_user_id uuid, p_credits integer, p_amount numeric, p_payment_ref text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_new_balance integer;
  v_invoice_number text;
begin
  if p_credits is null or p_credits < 1 then
    raise exception 'A purchase must add at least one credit';
  end if;

  if p_payment_ref is not null then
    perform pg_advisory_xact_lock(hashtextextended('credit-purchase:' || p_payment_ref, 0));

    if exists (
      select 1
      from public.credit_transactions ct
      where ct.type = 'purchase' and ct.reference_id = p_payment_ref
    ) then
      return false;
    end if;
  end if;

  -- Upsert wallet
  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, p_credits)
  on conflict (user_id)
  do update set balance = credit_wallets.balance + p_credits;

  select balance into v_new_balance
  from public.credit_wallets where user_id = p_user_id;

  -- Record transaction
  insert into public.credit_transactions (user_id, amount, type, description, reference_id, balance_after)
  values (p_user_id, p_credits, 'purchase', p_credits || ' credits purchased', p_payment_ref, v_new_balance);

  -- Generate invoice: no VAT, the total is the amount charged.
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.invoices (user_id, invoice_number, amount, tax, total, credits_purchased, payment_method, payment_reference)
  values (p_user_id, v_invoice_number, p_amount, 0, p_amount, p_credits, 'paystack', p_payment_ref);

  return true;
end;
$function$;