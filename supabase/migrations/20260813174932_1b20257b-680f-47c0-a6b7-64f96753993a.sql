grant execute on function public.unlock_worker_profile(uuid) to authenticated;
revoke execute on function public.ensure_employer_wallet(uuid) from anon, authenticated;
revoke execute on function public.apply_credit_ledger_entry(uuid, text, integer, text, uuid, uuid, uuid) from anon, authenticated;