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
$$;

drop function if exists public.list_unlocked_worker_profiles();

create function public.list_unlocked_worker_profiles()
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
    pu.unlocked_at,
    pu.expires_at
  from public.profile_unlocks pu
  join public.worker_profiles wp on wp.profile_id = pu.helper_id
  join public.profiles p on p.id = wp.profile_id
  left join category_rows cr on cr.worker_profile_id = wp.profile_id and cr.category_rank = 1
  where auth.uid() is not null
    and pu.employer_id = auth.uid()
  order by pu.unlocked_at desc
$$;

revoke all on function public.search_worker_previews(text, text, text, integer) from public, anon;
revoke all on function public.list_unlocked_worker_profiles() from public, anon;
grant execute on function public.search_worker_previews(text, text, text, integer) to authenticated;
grant execute on function public.list_unlocked_worker_profiles() to authenticated;

with canonical(slug, name, sort_order) as (
  values
    ('domestic-worker', 'Domestic Worker', 100),
    ('housekeeper', 'Housekeeper', 110),
    ('cleaner', 'Cleaner', 120),
    ('laundry-ironing', 'Laundry / Ironing', 130),
    ('household-cook', 'Household Cook', 140),
    ('house-manager', 'House Manager', 150),
    ('nanny', 'Nanny', 200),
    ('babysitter', 'Babysitter', 210),
    ('child-minder', 'Child Minder', 220),
    ('au-pair', 'Au Pair', 230),
    ('after-school-care', 'After-School Care', 240),
    ('night-nanny', 'Night Nanny', 250),
    ('elderly-caregiver', 'Elderly Caregiver', 300),
    ('home-caregiver', 'Home Caregiver', 310),
    ('disability-support-worker', 'Disability Support Worker', 320),
    ('companion-care', 'Companion Care', 330),
    ('home-care-assistant', 'Home Care Assistant', 340),
    ('gardener', 'Gardener', 400),
    ('garden-maintenance', 'Garden Maintenance', 410),
    ('lawn-care', 'Lawn Care', 420),
    ('landscaping', 'Landscaping', 430),
    ('pool-cleaner', 'Pool Cleaner', 440),
    ('outdoor-maintenance', 'Outdoor Maintenance', 450),
    ('handyman', 'Handyman', 500),
    ('plumber', 'Plumber', 510),
    ('electrician', 'Electrician', 520),
    ('painter', 'Painter', 530),
    ('tiler', 'Tiler', 540),
    ('carpenter', 'Carpenter', 550),
    ('appliance-repair', 'Appliance Repair', 560),
    ('general-maintenance', 'General Maintenance', 570),
    ('general-worker', 'General Worker', 600),
    ('moving-furniture-assistance', 'Moving / Furniture Assistance', 610),
    ('driver', 'Driver', 620),
    ('errand-assistant', 'Errand Assistant', 630),
    ('pet-care-dog-walker', 'Pet Care / Dog Walker', 640),
    ('house-sitter', 'House Sitter', 650)
)
insert into public.worker_categories (slug, name, sort_order, is_active)
select slug, name, sort_order, true
from canonical
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

create temp table category_slug_replacements(old_slug text primary key, new_slug text not null);

insert into category_slug_replacements(old_slug, new_slug) values
  ('nanny-childcare', 'nanny'),
  ('childcare-nanny', 'nanny'),
  ('nanny-childcare-worker', 'nanny'),
  ('elderly-care', 'elderly-caregiver'),
  ('elderly-care-worker', 'elderly-caregiver'),
  ('home-care', 'home-caregiver'),
  ('caregiver', 'home-caregiver'),
  ('domestic-cleaning', 'cleaner'),
  ('domestic-cleaner', 'cleaner'),
  ('general-maintenance-worker', 'general-maintenance'),
  ('maintenance', 'general-maintenance'),
  ('live-in-domestic-worker', 'domestic-worker'),
  ('live-out-domestic-worker', 'domestic-worker'),
  ('full-time-domestic-worker', 'domestic-worker'),
  ('part-time-domestic-worker', 'domestic-worker'),
  ('once-off-cleaning', 'cleaner'),
  ('contract-cleaner', 'cleaner')
on conflict (old_slug) do nothing;

insert into public.worker_category_memberships (worker_profile_id, category_id)
select wcm.worker_profile_id, target.id
from public.worker_category_memberships wcm
join public.worker_categories source on source.id = wcm.category_id
join category_slug_replacements replacement on replacement.old_slug = source.slug
join public.worker_categories target on target.slug = replacement.new_slug
on conflict do nothing;

delete from public.worker_category_memberships wcm
using public.worker_categories source, category_slug_replacements replacement
where wcm.category_id = source.id
  and replacement.old_slug = source.slug;

update public.skills skill
set category_id = target.id
from public.worker_categories source
join category_slug_replacements replacement on replacement.old_slug = source.slug
join public.worker_categories target on target.slug = replacement.new_slug
where skill.category_id = source.id;

with canonical_slugs(slug) as (
  values
    ('domestic-worker'), ('housekeeper'), ('cleaner'), ('laundry-ironing'), ('household-cook'), ('house-manager'),
    ('nanny'), ('babysitter'), ('child-minder'), ('au-pair'), ('after-school-care'), ('night-nanny'),
    ('elderly-caregiver'), ('home-caregiver'), ('disability-support-worker'), ('companion-care'), ('home-care-assistant'),
    ('gardener'), ('garden-maintenance'), ('lawn-care'), ('landscaping'), ('pool-cleaner'), ('outdoor-maintenance'),
    ('handyman'), ('plumber'), ('electrician'), ('painter'), ('tiler'), ('carpenter'), ('appliance-repair'), ('general-maintenance'),
    ('general-worker'), ('moving-furniture-assistance'), ('driver'), ('errand-assistant'), ('pet-care-dog-walker'), ('house-sitter')
)
update public.worker_categories wc
set is_active = false,
    updated_at = now()
where not exists (select 1 from canonical_slugs cs where cs.slug = wc.slug);

drop table if exists category_slug_replacements;