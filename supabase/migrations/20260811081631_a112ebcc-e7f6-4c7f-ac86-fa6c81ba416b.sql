create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  title text,
  category text,
  location text,
  employment_type text,
  work_arrangement text,
  salary_preference text,
  frequency text not null default 'Daily' check (frequency in ('Instant', 'Daily', 'Weekly')),
  push_enabled boolean not null default true,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.job_alerts to authenticated;
grant all on public.job_alerts to service_role;

alter table public.job_alerts enable row level security;

drop policy if exists "workers_manage_own_job_alerts" on public.job_alerts;
create policy "workers_manage_own_job_alerts" on public.job_alerts
for all to authenticated
using (worker_profile_id = auth.uid()) with check (worker_profile_id = auth.uid());

create index if not exists idx_job_alerts_worker_profile_id on public.job_alerts(worker_profile_id);
create index if not exists idx_job_alerts_category on public.job_alerts(category);
create index if not exists idx_job_alerts_location on public.job_alerts(location);
create index if not exists idx_job_alerts_frequency on public.job_alerts(frequency);

drop trigger if exists job_alerts_set_updated_at on public.job_alerts;
create trigger job_alerts_set_updated_at before update on public.job_alerts
for each row execute function public.set_updated_at();