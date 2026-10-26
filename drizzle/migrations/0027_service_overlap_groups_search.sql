create table if not exists public.service_overlap_groups (
  group_key text not null,
  category_name text not null,
  primary key (group_key, category_name)
);

alter table public.service_overlap_groups enable row level security;

insert into public.service_overlap_groups (group_key, category_name) values
  ('home_cleaning', 'Cleaner'),
  ('home_cleaning', 'Housekeeper'),
  ('home_cleaning', 'Laundry / Ironing'),
  ('childcare', 'Nanny'),
  ('childcare', 'Babysitter'),
  ('childcare', 'Night Nanny'),
  ('childcare', 'Au Pair'),
  ('childcare', 'After-School Care'),
  ('childcare', 'Child Minder'),
  ('personal_care', 'Elderly Caregiver'),
  ('personal_care', 'Home Care Assistant'),
  ('personal_care', 'Companion Care'),
  ('personal_care', 'Disability Support Carer'),
  ('garden', 'Gardener'),
  ('garden', 'Garden Maintenance'),
  ('garden', 'Lawn Care'),
  ('garden', 'Landscaping'),
  ('garden', 'Outdoor Maintenance'),
  ('repairs', 'Handyman'),
  ('repairs', 'General Maintenance'),
  ('errands', 'Errand Assistant'),
  ('errands', 'General Helper'),
  ('pets_and_house_sitting', 'House Sitter'),
  ('pets_and_house_sitting', 'Pet Care / Dog Walker')
on conflict do nothing;

create or replace function public.search_worker_previews(
  search_text text default null::text,
  location_text text default null::text,
  category_slug text default null::text,
  limit_count integer default 30,
  p_city_id uuid default null::uuid
)
 returns table(worker_profile_id uuid, first_name text, surname_initial text, avatar_url text, primary_category text, primary_category_slug text, public_area text, city_name text, years_experience integer, skills text, availability_status text, expected_rate_min numeric, expected_rate_max numeric, phone_verified boolean, last_active_at timestamp with time zone, biography text, saved boolean, unlocked boolean, has_intro_video boolean, has_documents boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with category_rows as (
    select wcm.worker_profile_id, wc.name, wc.slug,
      row_number() over (partition by wcm.worker_profile_id order by wc.sort_order, wc.name) as category_rank
    from public.worker_category_memberships wcm
    join public.worker_categories wc on wc.id = wcm.category_id and wc.is_active = true
  )
  select
    wp.profile_id, left(p.first_name, 80), left(p.last_name, 1),
    coalesce(wp.profile_photo_url, wp.introduction_photo_url),
    coalesce(cr.name, 'General Worker'), coalesce(cr.slug, 'general-worker'),
    wp.public_area, sc.name, wp.years_experience, coalesce(wp.skills_text, ''),
    replace(wp.status::text, '_', ' '), wp.expected_rate_min, wp.expected_rate_max,
    p.phone_verified_at is not null,
    coalesce(wp.last_availability_confirmed_at, wp.searchable_at, wp.updated_at),
    wp.biography,
    exists (select 1 from public.saved_worker_profiles swp
      where swp.employer_profile_id = auth.uid() and swp.worker_profile_id = wp.profile_id),
    exists (select 1 from public.profile_unlocks pu
      where pu.employer_id = auth.uid() and pu.helper_id = wp.profile_id and pu.expires_at > now()),
    coalesce(wp.intro_video_url, wp.introduction_video_url) is not null,
    exists (select 1 from public.worker_documents wd where wd.worker_profile_id = wp.profile_id)
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  left join public.sa_cities sc on sc.id = wp.city_id
  left join public.sa_provinces sp on sp.id = sc.province_id
  where auth.uid() is not null
    and wp.status in ('active_available', 'temporarily_unavailable')
    and p.status = 'active'
    and p.deleted_at is null
    and wp.searchable_at is not null
    and (
      category_slug is null or category_slug = ''
      or exists (
        select 1 from category_rows any_cr
        where any_cr.worker_profile_id = wp.profile_id
          and (
            any_cr.slug = category_slug
            or exists (
              select 1
              from public.worker_categories wanted
              join public.service_overlap_groups g1 on g1.category_name = wanted.name
              join public.service_overlap_groups g2 on g2.group_key = g1.group_key
              where wanted.slug = category_slug and g2.category_name = any_cr.name
            )
          )
      )
    )
    and (
      search_text is null or search_text = ''
      or p.first_name ilike '%' || search_text || '%'
      or exists (
        select 1 from category_rows any_cr
        where any_cr.worker_profile_id = wp.profile_id
          and (
            any_cr.name ilike '%' || search_text || '%'
            or exists (
              select 1
              from public.service_overlap_groups g1
              join public.service_overlap_groups g2 on g2.group_key = g1.group_key
              where g1.category_name ilike '%' || search_text || '%' and g2.category_name = any_cr.name
            )
          )
      )
      or coalesce(wp.skills_text, '') ilike '%' || search_text || '%'
      or coalesce(wp.biography, '') ilike '%' || search_text || '%'
      or replace(wp.status::text, '_', ' ') ilike '%' || search_text || '%'
    )
    and (
      location_text is null or location_text = ''
      or coalesce(wp.public_area, '') ilike '%' || location_text || '%'
      or coalesce(sc.name, '') ilike '%' || location_text || '%'
      or coalesce(sp.name, '') ilike '%' || location_text || '%'
    )
    and (p_city_id is null or wp.city_id = p_city_id)
  order by
    case
      when search_text is null or search_text = '' then 0
      when exists (
        select 1 from category_rows exact_cr
        where exact_cr.worker_profile_id = wp.profile_id and exact_cr.name ilike '%' || search_text || '%'
      ) then 0
      else 1
    end,
    case when wp.status = 'active_available' then 0 else 1 end,
    coalesce(wp.last_availability_confirmed_at, wp.searchable_at, wp.updated_at) desc
  limit greatest(1, least(coalesce(limit_count, 30), 50))
$function$;