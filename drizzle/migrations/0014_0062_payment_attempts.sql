create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reference text not null unique,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'abandoned')),
  gateway_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_payment_attempts_user_created
  on public.payment_attempts (user_id, created_at desc);

alter table public.payment_attempts enable row level security;

drop policy if exists "Users can view their own payment attempts" on public.payment_attempts;

create policy "Users can view their own payment attempts"
  on public.payment_attempts as permissive
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.payment_attempts from anon, authenticated;
grant select on public.payment_attempts to authenticated;
grant all on public.payment_attempts to service_role;