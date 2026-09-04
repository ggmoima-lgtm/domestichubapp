DROP FUNCTION IF EXISTS public.search_worker_previews(text, text, text, integer);

CREATE OR REPLACE FUNCTION public.search_worker_previews(
  search_text text DEFAULT NULL::text,
  location_text text DEFAULT NULL::text,
  category_slug text DEFAULT NULL::text,
  limit_count integer DEFAULT 30
)
RETURNS TABLE(
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
  last_active_at timestamp with time zone,
  biography text,
  saved boolean,
  unlocked boolean,
  has_intro_video boolean,
  has_documents boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    ),
    coalesce(wp.intro_video_url, wp.introduction_video_url) is not null,
    exists (
      select 1 from public.worker_documents wd
      where wd.worker_profile_id = wp.profile_id
    )
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  where auth.uid() is not null
    and wp.status in ('active_available', 'temporarily_unavailable')
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
$function$;

GRANT EXECUTE ON FUNCTION public.search_worker_previews(text, text, text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.search_worker_previews(text, text, text, integer) FROM PUBLIC, anon;
