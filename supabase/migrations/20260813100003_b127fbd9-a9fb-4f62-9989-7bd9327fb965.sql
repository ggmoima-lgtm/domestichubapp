alter table public.worker_profiles
  add column if not exists expected_rate_min numeric,
  add column if not exists expected_rate_max numeric;

alter table public.profiles
  add column if not exists deleted_at timestamptz;

create table if not exists public.saved_worker_profiles (
  employer_profile_id uuid not null references public.employer_profiles(profile_id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (employer_profile_id, worker_profile_id)
);

grant select, insert, update, delete on public.saved_worker_profiles to authenticated;
grant all on public.saved_worker_profiles to service_role;

alter table public.saved_worker_profiles enable row level security;

drop policy if exists "employers_manage_own_saved_workers" on public.saved_worker_profiles;
create policy "employers_manage_own_saved_workers" on public.saved_worker_profiles
for all to authenticated using (employer_profile_id = auth.uid()) with check (employer_profile_id = auth.uid());

create index if not exists idx_saved_worker_profiles_saved_at
on public.saved_worker_profiles(employer_profile_id, saved_at desc);

create or replace function public.search_worker_previews(
  search_text text default null,
  location_text text default null,
  category_slug text default null,
  limit_count integer default 30
)
returns table (
  worker_profile_id uuid,
  first_name text,
  surname_initial text,
  avatar_url text,
  primary_category text,
  primary_category_slug text,
  public_area text,
  years_experience integer,
  skills text,
  availability_status text,
  expected_rate_min numeric,
  expected_rate_max numeric,
  phone_verified boolean,
  last_active_at timestamptz,
  biography text,
  saved boolean,
  unlocked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with category_rows as (
    select
      wcm.worker_profile_id,
      wc.name,
      wc.slug,
      row_number() over (partition by wcm.worker_profile_id order by wc.sort_order, wc.name) as category_rank
    from public.worker_category_memberships wcm
    join public.worker_categories wc on wc.id = wcm.category_id and wc.is_active = true
  )
  select
    wp.profile_id,
    left(p.first_name, 80),
    left(p.last_name, 1),
    coalesce(wp.profile_photo_url, wp.introduction_photo_url),
    coalesce(cr.name, 'General Worker'),
    coalesce(cr.slug, 'general-worker'),
    wp.public_area,
    wp.years_experience,
    coalesce(wp.skills_text, ''),
    replace(wp.status::text, '_', ' '),
    wp.expected_rate_min,
    wp.expected_rate_max,
    p.phone_verified_at is not null,
    coalesce(wp.last_availability_confirmed_at, wp.searchable_at, wp.updated_at),
    wp.biography,
    exists (
      select 1 from public.saved_worker_profiles swp
      where swp.employer_profile_id = auth.uid()
        and swp.worker_profile_id = wp.profile_id
    ),
    exists (
      select 1 from public.profile_unlocks pu
      where pu.employer_id = auth.uid()
        and pu.helper_id = wp.profile_id
        and pu.expires_at > now()
    )
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  where wp.status in ('active_available', 'temporarily_unavailable')
    and p.status = 'active'
    and p.deleted_at is null
    and wp.searchable_at is not null
    and (category_slug is null or category_slug = '' or cr.slug = category_slug)
    and (
      search_text is null
      or search_text = ''
      or p.first_name ilike '%' || search_text || '%'
      or cr.name ilike '%' || search_text || '%'
      or coalesce(wp.skills_text, '') ilike '%' || search_text || '%'
      or coalesce(wp.biography, '') ilike '%' || search_text || '%'
      or replace(wp.status::text, '_', ' ') ilike '%' || search_text || '%'
    )
    and (
      location_text is null
      or location_text = ''
      or coalesce(wp.public_area, '') ilike '%' || location_text || '%'
    )
  order by
    case when wp.status = 'active_available' then 0 else 1 end,
    coalesce(wp.last_availability_confirmed_at, wp.searchable_at, wp.updated_at) desc
  limit greatest(1, least(coalesce(limit_count, 30), 50))
$$;

create or replace function public.list_unlocked_worker_profiles()
returns table (
  worker_profile_id uuid,
  first_name text,
  surname_initial text,
  avatar_url text,
  primary_category text,
  public_area text,
  years_experience integer,
  skills text,
  availability_status text,
  expected_rate_min numeric,
  expected_rate_max numeric,
  phone_verified boolean,
  unlocked_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with category_rows as (
    select
      wcm.worker_profile_id,
      wc.name,
      row_number() over (partition by wcm.worker_profile_id order by wc.sort_order, wc.name) as category_rank
    from public.worker_category_memberships wcm
    join public.worker_categories wc on wc.id = wcm.category_id and wc.is_active = true
  )
  select
    wp.profile_id,
    left(p.first_name, 80),
    left(p.last_name, 1),
    coalesce(wp.profile_photo_url, wp.introduction_photo_url),
    coalesce(cr.name, 'General Worker'),
    wp.public_area,
    wp.years_experience,
    coalesce(wp.skills_text, ''),
    replace(wp.status::text, '_', ' '),
    wp.expected_rate_min,
    wp.expected_rate_max,
    p.phone_verified_at is not null,
    pu.unlocked_at,
    pu.expires_at
  from public.profile_unlocks pu
  join public.worker_profiles wp on wp.profile_id = pu.helper_id
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  where pu.employer_id = auth.uid()
  order by pu.unlocked_at desc
$$;

grant execute on function public.search_worker_previews(text, text, text, integer) to authenticated;
grant execute on function public.list_unlocked_worker_profiles() to authenticated;