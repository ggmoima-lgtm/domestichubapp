-- Create wallets for any user with transactions but no wallet
insert into public.credit_wallets (user_id, balance)
select user_id, greatest(sum(amount)::integer, 0)
from public.credit_transactions
group by user_id
on conflict (user_id) do nothing;

-- Reconcile balances with transaction ledger
with ledger_totals as (
  select user_id, greatest(sum(amount)::integer, 0) as ledger_balance
  from public.credit_transactions
  group by user_id
)
update public.credit_wallets wallet
set balance = ledger_totals.ledger_balance,
    updated_at = now()
from ledger_totals
where wallet.user_id = ledger_totals.user_id
  and wallet.balance <> ledger_totals.ledger_balance;

create or replace function public.get_employer_wallet_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  employer uuid := auth.uid();
  wallet public.credit_wallets%rowtype;
  ledger_balance integer;
  ledger_entries integer;
begin
  if employer is null then
    raise exception 'Please sign in before opening your wallet';
  end if;

  wallet := public.ensure_employer_wallet(employer);

  select
    coalesce(sum(ct.amount), 0)::integer,
    count(*)::integer
  into ledger_balance, ledger_entries
  from public.credit_transactions ct
  where ct.user_id = employer;

  return jsonb_build_object(
    'employerProfileId', employer,
    'balance', wallet.balance,
    'ledgerBalance', ledger_balance,
    'ledgerEntries', ledger_entries,
    'ledgerMatchesWallet', wallet.balance = ledger_balance,
    'updatedAt', wallet.updated_at
  );
end;
$$;

grant execute on function public.get_employer_wallet_state() to authenticated;