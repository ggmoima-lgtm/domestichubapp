CREATE OR REPLACE FUNCTION public.get_public_job(target_job_id uuid)
RETURNS TABLE(
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
  employer_phone_verified boolean
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
    p.phone_verified_at is not null
  from public.jobs j
  join public.worker_categories wc on wc.id = j.category_id
  join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
  join public.profiles p on p.id = ep.profile_id
  where auth.uid() is not null
    and j.id = target_job_id
    and j.status = 'published'
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.search_public_jobs(
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
RETURNS TABLE(
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
      p.phone_verified_at is not null as employer_phone_verified
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

CREATE OR REPLACE FUNCTION public.get_job_applicant_previews(target_job_id uuid)
RETURNS TABLE(
  application_id uuid,
  job_id uuid,
  worker_profile_id uuid,
  first_name text,
  surname_initial text,
  category_name text,
  public_area text,
  years_experience integer,
  availability_status text,
  expected_rate_min numeric,
  expected_rate_max numeric,
  last_availability_confirmed_at timestamp with time zone,
  phone_verified boolean,
  application_status text,
  submitted_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with category_rows as (
    select
      wcm.worker_profile_id,
      wc.name,
      row_number() over (partition by wcm.worker_profile_id order by wc.sort_order, wc.name) as category_rank
    from public.worker_category_memberships wcm
    join public.worker_categories wc on wc.id = wcm.category_id and wc.is_active = true
  )
  select
    ja.id,
    ja.job_id,
    ja.helper_id,
    left(p.first_name, 80),
    left(p.last_name, 1),
    coalesce(cr.name, 'General Worker'),
    wp.public_area,
    wp.years_experience,
    wp.status,
    wp.expected_rate_min,
    wp.expected_rate_max,
    wp.last_availability_confirmed_at,
    p.phone_verified_at is not null,
    ja.status,
    ja.created_at
  from public.job_applications ja
  join public.jobs j on j.id = ja.job_id
  join public.worker_profiles wp on wp.profile_id = ja.helper_id
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  where j.employer_profile_id = auth.uid()
    and ja.job_id = target_job_id
  order by ja.created_at desc
$function$;

CREATE OR REPLACE FUNCTION public.get_applicant_preview(target_application_id uuid)
RETURNS TABLE(
  application_id uuid,
  job_id uuid,
  worker_profile_id uuid,
  first_name text,
  surname_initial text,
  category_name text,
  public_area text,
  years_experience integer,
  availability_status text,
  expected_rate_min numeric,
  expected_rate_max numeric,
  last_availability_confirmed_at timestamp with time zone,
  phone_verified boolean,
  application_status text,
  submitted_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with category_rows as (
    select
      wcm.worker_profile_id,
      wc.name,
      row_number() over (partition by wcm.worker_profile_id order by wc.sort_order, wc.name) as category_rank
    from public.worker_category_memberships wcm
    join public.worker_categories wc on wc.id = wcm.category_id and wc.is_active = true
  )
  select
    ja.id,
    ja.job_id,
    ja.helper_id,
    left(p.first_name, 80),
    left(p.last_name, 1),
    coalesce(cr.name, 'General Worker'),
    wp.public_area,
    wp.years_experience,
    wp.status,
    wp.expected_rate_min,
    wp.expected_rate_max,
    wp.last_availability_confirmed_at,
    p.phone_verified_at is not null,
    ja.status,
    ja.created_at
  from public.job_applications ja
  join public.jobs j on j.id = ja.job_id
  join public.worker_profiles wp on wp.profile_id = ja.helper_id
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  where j.employer_profile_id = auth.uid()
    and ja.id = target_application_id
  limit 1
$function$;

-- Restrict execution to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_public_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_applicant_previews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_applicant_preview(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_job(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_public_jobs(text, text, text[], text[], timestamp with time zone, text[], text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_job_applicant_previews(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_applicant_preview(uuid) FROM PUBLIC, anon;