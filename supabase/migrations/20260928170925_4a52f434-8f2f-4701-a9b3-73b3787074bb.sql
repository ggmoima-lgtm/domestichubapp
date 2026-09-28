drop function if exists public.get_public_job(uuid);
drop function if exists public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer);
drop function if exists public.search_worker_previews(text, text, text, integer);

create or replace function public.get_public_job(target_job_id uuid)
returns table(id uuid, title text, status text, category_slug text, category_name text, employment_type text, work_arrangement text, public_area text, city_name text, start_date date, salary_min numeric, salary_max numeric, duties text, published_at timestamp with time zone, employer_phone_verified boolean, employer_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select j.id, j.title, j.status, wc.slug, wc.name, j.employment_type, j.work_arrangement, j.public_area, sc.name,
    j.start_date, j.salary_min, j.salary_max, j.duties, j.created_at, p.phone_verified_at is not null,
    nullif(trim(concat_ws(' ', left(p.first_name, 80), case when coalesce(p.last_name, '') <> '' then left(p.last_name, 1) || '.' end)), '')
  from public.jobs j
  join public.worker_categories wc on wc.id = j.category_id
  join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
  join public.profiles p on p.id = ep.profile_id
  left join public.sa_cities sc on sc.id = j.city_id
  where auth.uid() is not null and j.id = target_job_id and j.status = 'published'
  limit 1
$function$;

create or replace function public.search_public_jobs(
  search_text text default null, location_text text default null, category_slugs text[] default null, regions text[] default null,
  posted_since timestamp with time zone default null, employment_types text[] default null, work_arrangement_filter text default null,
  sort_by text default 'newest', limit_count integer default 30, offset_count integer default 0, p_city_id uuid default null)
returns table(id uuid, title text, status text, category_slug text, category_name text, employment_type text, work_arrangement text, public_area text, city_name text, start_date date, salary_min numeric, salary_max numeric, duties text, published_at timestamp with time zone, employer_phone_verified boolean, employer_name text, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with matches as (
    select j.id, j.title, j.status, wc.slug as category_slug, wc.name as category_name, j.employment_type, j.work_arrangement,
      j.public_area, sc.name as city_name, j.start_date, j.salary_min, j.salary_max, j.duties, j.created_at as published_at,
      p.phone_verified_at is not null as employer_phone_verified,
      nullif(trim(concat_ws(' ', left(p.first_name, 80), case when coalesce(p.last_name, '') <> '' then left(p.last_name, 1) || '.' end)), '') as employer_name
    from public.jobs j
    join public.worker_categories wc on wc.id = j.category_id
    join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
    join public.profiles p on p.id = ep.profile_id
    left join public.sa_cities sc on sc.id = j.city_id
    where auth.uid() is not null
      and j.status = 'published'
      and (category_slugs is null or array_length(category_slugs, 1) is null or wc.slug = any(category_slugs))
      and (employment_types is null or array_length(employment_types, 1) is null or j.employment_type = any(employment_types))
      and (work_arrangement_filter is null or work_arrangement_filter = '' or j.work_arrangement = work_arrangement_filter)
      and (posted_since is null or j.created_at >= posted_since)
      and (location_text is null or location_text = '' or coalesce(j.public_area, '') ilike '%' || location_text || '%')
      and (p_city_id is null or j.city_id = p_city_id)
      and (regions is null or array_length(regions, 1) is null
        or exists (select 1 from unnest(regions) as region where coalesce(j.public_area, '') ilike '%' || region || '%'))
      and (search_text is null or search_text = ''
        or j.title ilike '%' || search_text || '%'
        or wc.name ilike '%' || search_text || '%'
        or coalesce(j.duties, '') ilike '%' || search_text || '%')
  )
  select m.*, count(*) over() as total_count
  from matches m
  order by
    case when sort_by = 'oldest' then m.published_at end asc,
    case when sort_by = 'salary_desc' then m.salary_max end desc nulls last,
    case when sort_by = 'salary_asc' then m.salary_min end asc nulls last,
    case when sort_by not in ('oldest', 'salary_desc', 'salary_asc') then m.published_at end desc
  limit greatest(1, least(coalesce(limit_count, 30), 50))
  offset greatest(0, coalesce(offset_count, 0))
$function$;

create or replace function public.search_worker_previews(
  search_text text default null, location_text text default null, category_slug text default null,
  limit_count integer default 30, p_city_id uuid default null)
returns table(worker_profile_id uuid, first_name text, surname_initial text, avatar_url text, primary_category text, primary_category_slug text, public_area text, city_name text, years_experience integer, skills text, availability_status text, expected_rate_min numeric, expected_rate_max numeric, phone_verified boolean, last_active_at timestamp with time zone, biography text, saved boolean, unlocked boolean, has_intro_video boolean, has_documents boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with category_rows as (
    select wcm.worker_profile_id, wc.name, wc.slug,
      row_number() over (partition by wcm.worker_profile_id order by wc.sort_order, wc.name) as category_rank
    from public.worker_category_memberships wcm
    join public.worker_categories wc on wc.id = wcm.category_id and wc.is_active = true
  )
  select wp.profile_id, left(p.first_name, 80), left(p.last_name, 1),
    coalesce(wp.profile_photo_url, wp.introduction_photo_url),
    coalesce(cr.name, 'General Worker'), coalesce(cr.slug, 'general-worker'),
    wp.public_area, sc.name, wp.years_experience, coalesce(wp.skills_text, ''),
    replace(wp.status::text, '_', ' '), wp.expected_rate_min, wp.expected_rate_max,
    p.phone_verified_at is not null,
    coalesce(wp.last_availability_confirmed_at, wp.searchable_at, wp.updated_at),
    wp.biography,
    exists (select 1 from public.saved_worker_profiles swp where swp.employer_profile_id = auth.uid() and swp.worker_profile_id = wp.profile_id),
    exists (select 1 from public.profile_unlocks pu where pu.employer_id = auth.uid() and pu.helper_id = wp.profile_id and pu.expires_at > now()),
    coalesce(wp.intro_video_url, wp.introduction_video_url) is not null,
    exists (select 1 from public.worker_documents wd where wd.worker_profile_id = wp.profile_id)
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  left join public.sa_cities sc on sc.id = wp.city_id
  where auth.uid() is not null
    and wp.status in ('active_available', 'temporarily_unavailable')
    and p.status = 'active'
    and p.deleted_at is null
    and wp.searchable_at is not null
    and (category_slug is null or category_slug = '' or cr.slug = category_slug)
    and (search_text is null or search_text = ''
      or p.first_name ilike '%' || search_text || '%'
      or cr.name ilike '%' || search_text || '%'
      or coalesce(wp.skills_text, '') ilike '%' || search_text || '%'
      or coalesce(wp.biography, '') ilike '%' || search_text || '%'
      or replace(wp.status::text, '_', ' ') ilike '%' || search_text || '%')
    and (location_text is null or location_text = '' or coalesce(wp.public_area, '') ilike '%' || location_text || '%')
    and (p_city_id is null or wp.city_id = p_city_id)
  order by
    case when wp.status = 'active_available' then 0 else 1 end,
    coalesce(wp.last_availability_confirmed_at, wp.searchable_at, wp.updated_at) desc
  limit greatest(1, least(coalesce(limit_count, 30), 50))
$function$;

revoke all on function public.get_public_job(uuid) from public, anon;
revoke all on function public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer, uuid) from public, anon;
revoke all on function public.search_worker_previews(text, text, text, integer, uuid) from public, anon;
grant execute on function public.get_public_job(uuid) to authenticated, service_role;
grant execute on function public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer, uuid) to authenticated, service_role;
grant execute on function public.search_worker_previews(text, text, text, integer, uuid) to authenticated, service_role;