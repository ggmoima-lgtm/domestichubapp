create table if not exists public.block_events (

  id uuid primary key default gen_random_uuid(),

  blocker_id uuid not null,

  blocked_id uuid not null,

  action text not null check (action in ('blocked', 'unblocked')),

  created_at timestamptz not null default now()

);

GRANT ALL ON public.block_events TO service_role;