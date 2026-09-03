alter table public.worker_availability
  add column if not exists days_available text[] not null default '{}',
  add column if not exists hours_available text;