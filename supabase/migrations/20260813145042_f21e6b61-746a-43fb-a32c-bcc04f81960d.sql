drop function if exists public.ensure_employer_wallet(uuid);

create or replace function public.ensure_employer_wallet(employer uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet public.credit_wallets%rowtype;
begin
  insert into public.credit_wallets (user_id, balance)
  values (employer, 0)
  on conflict (user_id) do nothing;

  select * into wallet from public.credit_wallets where user_id = employer;
  return wallet;
end;
$$;

create or replace function public.apply_credit_ledger_entry(
  employer uuid,
  entry_type text,
  credit_delta integer,
  reason text default null,
  reference_id uuid default null,
  actor uuid default null,
  store_transaction uuid default null
)
returns public.credit_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet public.credit_wallets%rowtype;
  entry public.credit_transactions%rowtype;
begin
  perform public.ensure_employer_wallet(employer);

  select * into wallet
  from public.credit_wallets
  where user_id = employer
  for update;

  if wallet.balance + credit_delta < 0 then
    raise exception 'Credit wallet cannot go negative';
  end if;

  update public.credit_wallets
  set balance = wallet.balance + credit_delta, updated_at = now()
  where user_id = employer;

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    balance_after
  )
  values (
    employer,
    credit_delta,
    entry_type,
    reason,
    reference_id::text,
    wallet.balance + credit_delta
  )
  returning * into entry;

  return entry;
end;
$$;

create or replace function public.unlock_worker_profile(worker uuid)
returns public.profile_unlocks
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_unlock public.profile_unlocks%rowtype;
  ledger_row public.credit_transactions%rowtype;
  unlock_row public.profile_unlocks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Please sign in before unlocking worker profiles';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || worker::text, 0));

  if worker = auth.uid() then
    raise exception 'Employers cannot unlock their own profile';
  end if;

  if not exists (select 1 from public.employer_profiles ep where ep.profile_id = auth.uid()) then
    raise exception 'Only employers can unlock worker profiles';
  end if;

  if not exists (
    select 1
    from public.worker_profiles wp
    where wp.profile_id = worker
      and wp.status in ('active_available', 'temporarily_unavailable', 'hired', 'not_looking')
  ) then
    raise exception 'Worker profile is not available for unlock';
  end if;

  select * into existing_unlock
  from public.profile_unlocks
  where employer_id = auth.uid()
    and helper_id = worker
    and expires_at > now()
  order by expires_at desc
  limit 1;

  if existing_unlock.id is not null then
    return existing_unlock;
  end if;

  ledger_row := public.apply_credit_ledger_entry(
    auth.uid(),
    'unlock_debit',
    -1,
    'Worker profile unlock',
    worker,
    auth.uid(),
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
    auth.uid(),
    worker,
    1,
    'credit',
    now(),
    now() + interval '30 days'
  )
  returning * into unlock_row;

  return unlock_row;
end;
$$;

grant execute on function public.unlock_worker_profile(uuid) to authenticated;
revoke execute on function public.ensure_employer_wallet(uuid) from anon, authenticated;
revoke execute on function public.apply_credit_ledger_entry(uuid, text, integer, text, uuid, uuid, uuid) from anon, authenticated;