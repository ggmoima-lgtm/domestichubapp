drop function if exists public.get_public_job(uuid);

drop function if exists public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer);

create or replace function public.get_public_job(target_job_id uuid)
returns table(
  id uuid,
  title text,
  status text,
  category_slug text,
  category_name text,
  employment_type text,
  work_arrangement text,
  public_area text,
  start_date date,
  salary_min numeric,
  salary_max numeric,
  duties text,
  published_at timestamp with time zone,
  employer_phone_verified boolean,
  employer_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select
    j.id,
    j.title,
    j.status,
    wc.slug,
    wc.name,
    j.employment_type,
    j.work_arrangement,
    j.public_area,
    j.start_date,
    j.salary_min,
    j.salary_max,
    j.duties,
    j.created_at,
    p.phone_verified_at is not null,
    nullif(trim(concat_ws(' ', left(p.first_name, 80), case when coalesce(p.last_name, '') <> '' then left(p.last_name, 1) || '.' end)), '')
  from public.jobs j
  join public.worker_categories wc on wc.id = j.category_id
  join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
  join public.profiles p on p.id = ep.profile_id
  where auth.uid() is not null
    and j.id = target_job_id
    and j.status = 'published'
  limit 1
$function$;

create or replace function public.search_public_jobs(
  search_text text default null,
  location_text text default null,
  category_slugs text[] default null,
  regions text[] default null,
  posted_since timestamp with time zone default null,
  employment_types text[] default null,
  work_arrangement_filter text default null,
  sort_by text default 'newest',
  limit_count integer default 30,
  offset_count integer default 0
)
returns table(
  id uuid,
  title text,
  status text,
  category_slug text,
  category_name text,
  employment_type text,
  work_arrangement text,
  public_area text,
  start_date date,
  salary_min numeric,
  salary_max numeric,
  duties text,
  published_at timestamp with time zone,
  employer_phone_verified boolean,
  employer_name text,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with matches as (
    select
      j.id,
      j.title,
      j.status,
      wc.slug as category_slug,
      wc.name as category_name,
      j.employment_type,
      j.work_arrangement,
      j.public_area,
      j.start_date,
      j.salary_min,
      j.salary_max,
      j.duties,
      j.created_at as published_at,
      p.phone_verified_at is not null as employer_phone_verified,
      nullif(trim(concat_ws(' ', left(p.first_name, 80), case when coalesce(p.last_name, '') <> '' then left(p.last_name, 1) || '.' end)), '') as employer_name
    from public.jobs j
    join public.worker_categories wc on wc.id = j.category_id
    join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
    join public.profiles p on p.id = ep.profile_id
    where auth.uid() is not null
      and j.status = 'published'
      and (category_slugs is null or array_length(category_slugs, 1) is null or wc.slug = any(category_slugs))
      and (employment_types is null or array_length(employment_types, 1) is null or j.employment_type = any(employment_types))
      and (work_arrangement_filter is null or work_arrangement_filter = '' or j.work_arrangement = work_arrangement_filter)
      and (posted_since is null or j.created_at >= posted_since)
      and (location_text is null or location_text = '' or coalesce(j.public_area, '') ilike '%' || location_text || '%')
      and (
        regions is null or array_length(regions, 1) is null
        or exists (select 1 from unnest(regions) as region where coalesce(j.public_area, '') ilike '%' || region || '%')
      )
      and (
        search_text is null or search_text = ''
        or j.title ilike '%' || search_text || '%'
        or wc.name ilike '%' || search_text || '%'
        or coalesce(j.duties, '') ilike '%' || search_text || '%'
      )
  )
  select
    m.*,
    count(*) over() as total_count
  from matches m
  order by
    case when sort_by = 'oldest' then m.published_at end asc,
    case when sort_by = 'salary_desc' then m.salary_max end desc nulls last,
    case when sort_by = 'salary_asc' then m.salary_min end asc nulls last,
    case when sort_by not in ('oldest', 'salary_desc', 'salary_asc') then m.published_at end desc
  limit greatest(1, least(coalesce(limit_count, 30), 50))
  offset greatest(0, coalesce(offset_count, 0))
$function$;

revoke execute on function public.get_public_job(uuid) from public;
revoke execute on function public.get_public_job(uuid) from anon;
grant execute on function public.get_public_job(uuid) to authenticated;

revoke execute on function public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer) from public;
revoke execute on function public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer) from anon;
grant execute on function public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer) to authenticated;