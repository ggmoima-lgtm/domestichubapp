alter table public.worker_profiles
  add column if not exists own_transport boolean not null default false,
  add column if not exists own_tools boolean not null default false;