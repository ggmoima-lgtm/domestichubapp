alter table public.jobs add column if not exists city_id uuid references public.sa_cities(id);
alter table public.worker_profiles add column if not exists city_id uuid references public.sa_cities(id);
alter table public.employer_profiles add column if not exists city_id uuid references public.sa_cities(id);
alter table public.job_alerts add column if not exists city_ids uuid[] not null default '{}';
create index if not exists idx_jobs_city_id on public.jobs(city_id);
create index if not exists idx_worker_profiles_city_id on public.worker_profiles(city_id);
create index if not exists idx_employer_profiles_city_id on public.employer_profiles(city_id);
create index if not exists idx_job_alerts_city_ids on public.job_alerts using gin(city_ids);