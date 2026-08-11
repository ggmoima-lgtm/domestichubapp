alter table public.worker_profiles
  add column if not exists salary_type text,
  add column if not exists gender text,
  add column if not exists nationality text,
  add column if not exists willing_to_travel boolean not null default false,
  add column if not exists travel_radius text,
  add column if not exists work_arrangement text,
  add column if not exists weekends boolean not null default false,
  add column if not exists public_holidays boolean not null default false,
  add column if not exists driver_licence boolean not null default false,
  add column if not exists vehicle_available boolean not null default false;

alter table public.worker_availability
  add column if not exists travel_radius text;

alter table public.worker_categories
  add column if not exists sort_order integer not null default 0;

create table if not exists public.worker_documents (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  document_type text,
  file_path text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.worker_documents to authenticated;
grant all on public.worker_documents to service_role;
alter table public.worker_documents enable row level security;
drop policy if exists "worker_documents_owner" on public.worker_documents;
create policy "worker_documents_owner" on public.worker_documents
for all to authenticated using (worker_profile_id = auth.uid()) with check (worker_profile_id = auth.uid());

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.worker_categories(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);
grant select on public.skills to anon, authenticated;
grant all on public.skills to service_role;
alter table public.skills enable row level security;
drop policy if exists "Anyone can view active skills" on public.skills;
create policy "Anyone can view active skills" on public.skills for select using (is_active = true);
drop policy if exists "Admins manage skills" on public.skills;
create policy "Admins manage skills" on public.skills for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.worker_work_experiences (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  employer_name text,
  role_title text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  responsibilities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_work_experience_dates check (end_date is null or start_date is null or end_date >= start_date)
);
grant select, insert, update, delete on public.worker_work_experiences to authenticated;
grant all on public.worker_work_experiences to service_role;
alter table public.worker_work_experiences enable row level security;
drop policy if exists "worker_work_experiences_owner" on public.worker_work_experiences;
create policy "worker_work_experiences_owner" on public.worker_work_experiences
for all to authenticated using (worker_profile_id = auth.uid()) with check (worker_profile_id = auth.uid());

create table if not exists public.worker_qualifications (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  qualification text,
  institution text,
  year integer check (year is null or year between 1950 and 2100),
  certificate_document_id uuid references public.worker_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.worker_qualifications to authenticated;
grant all on public.worker_qualifications to service_role;
alter table public.worker_qualifications enable row level security;
drop policy if exists "worker_qualifications_owner" on public.worker_qualifications;
create policy "worker_qualifications_owner" on public.worker_qualifications
for all to authenticated using (worker_profile_id = auth.uid()) with check (worker_profile_id = auth.uid());

create table if not exists public.worker_references (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  reference_name text,
  relationship text,
  employer_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.worker_references to authenticated;
grant all on public.worker_references to service_role;
alter table public.worker_references enable row level security;
drop policy if exists "worker_references_owner" on public.worker_references;
create policy "worker_references_owner" on public.worker_references
for all to authenticated using (worker_profile_id = auth.uid()) with check (worker_profile_id = auth.uid());

drop trigger if exists worker_documents_set_updated_at on public.worker_documents;
create trigger worker_documents_set_updated_at before update on public.worker_documents
for each row execute function public.set_updated_at();

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at before update on public.skills
for each row execute function public.set_updated_at();

drop trigger if exists worker_work_experiences_set_updated_at on public.worker_work_experiences;
create trigger worker_work_experiences_set_updated_at before update on public.worker_work_experiences
for each row execute function public.set_updated_at();

drop trigger if exists worker_qualifications_set_updated_at on public.worker_qualifications;
create trigger worker_qualifications_set_updated_at before update on public.worker_qualifications
for each row execute function public.set_updated_at();

drop trigger if exists worker_references_set_updated_at on public.worker_references;
create trigger worker_references_set_updated_at before update on public.worker_references
for each row execute function public.set_updated_at();