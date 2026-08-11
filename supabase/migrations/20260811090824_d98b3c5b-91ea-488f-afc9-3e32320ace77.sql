alter table public.worker_availability
  add column if not exists available_immediately boolean not null default false,
  add column if not exists available_from date;