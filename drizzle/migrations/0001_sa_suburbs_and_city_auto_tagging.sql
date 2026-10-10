create table if not exists public.sa_suburbs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.sa_cities(id) on delete cascade,
  name text not null,
  name_key text not null,
  created_at timestamptz not null default now(),
  unique (city_id, name_key)
);

create index if not exists idx_sa_suburbs_name_key on public.sa_suburbs(name_key);

grant select on public.sa_suburbs to anon, authenticated;
grant all on public.sa_suburbs to service_role;

alter table public.sa_suburbs enable row level security;
drop policy if exists "sa_suburbs_are_public" on public.sa_suburbs;
create policy "sa_suburbs_are_public" on public.sa_suburbs for select using (true);

create or replace function public.area_key(area text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(split_part(coalesce(area, ''), ',', 1)), '[^a-z0-9]', '', 'g')
$$;

create or replace function public.resolve_city_for_area(area text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  normalised text;
  key text := public.area_key(area);
  matches integer;
  found uuid;
begin
  if coalesce(trim(area), '') = '' then
    return null;
  end if;

  normalised := ' ' || lower(regexp_replace(area, '[^a-zA-Z0-9]+', ' ', 'g')) || ' ';

  select count(distinct c.id), (array_agg(c.id))[1]
  into matches, found
  from public.sa_cities c
  where normalised like '% ' || lower(regexp_replace(c.name, '[^a-zA-Z0-9]+', ' ', 'g')) || ' %';

  if matches = 1 then return found; end if;
  if matches > 1 then return null; end if;

  if length(key) < 3 then
    return null;
  end if;

  select count(distinct m.city_id), (array_agg(m.city_id))[1]
  into matches, found
  from (
    select city_id from public.sa_suburbs where name_key = key
    union all
    select city_id from public.jobs where city_id is not null and public.area_key(public_area) = key
    union all
    select city_id from public.worker_profiles where city_id is not null and public.area_key(public_area) = key
  ) m;

  if matches = 1 then return found; end if;
  return null;
end
$function$;

create or replace function public.tag_city_from_area()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.city_id is null and coalesce(trim(new.public_area), '') <> '' then
    new.city_id := public.resolve_city_for_area(new.public_area);
  end if;
  return new;
end
$function$;

revoke all on function public.resolve_city_for_area(text) from public, anon, authenticated;
revoke all on function public.tag_city_from_area() from public, anon, authenticated;

drop trigger if exists trg_jobs_tag_city on public.jobs;
create trigger trg_jobs_tag_city
  before insert or update of public_area, city_id on public.jobs
  for each row execute function public.tag_city_from_area();

drop trigger if exists trg_worker_profiles_tag_city on public.worker_profiles;
create trigger trg_worker_profiles_tag_city
  before insert or update of public_area, city_id on public.worker_profiles
  for each row execute function public.tag_city_from_area();

insert into public.sa_suburbs (city_id, name, name_key)
select c.id, s.name, public.area_key(s.name)
from public.sa_cities c
join public.sa_provinces p on p.id = c.province_id
join (values
  ('Amberfield'), ('Brakfontein'), ('Bronberrick'), ('Celtisdal'),
  ('Centurion Central'), ('Claudius'), ('Clubview'), ('Cornwall Hill'),
  ('Die Hoewes'), ('Doringkloof'), ('Eldoraigne'), ('Erasmia'),
  ('Gerhardsville'), ('Hennopspark'), ('Heritage Hill'), ('Heuweloord'),
  ('Highveld'), ('Hoekplaats'), ('Irene'), ('Kloofsig'),
  ('Knoppieslaagte'), ('Kosmosdal'), ('Laezonia'), ('Louwlardia'),
  ('Lyttelton'), ('Lyttelton Manor'), ('Midstream'), ('Mnandi'),
  ('Monavoni'), ('Olievenhoutbosch'), ('Pierre van Ryneveld Park'),
  ('Raslouw'), ('Rooihuiskraal'), ('Rooihuiskraal North'),
  ('Skurweplaas'), ('Southdowns'), ('Sunderland Ridge'), ('Thatchfield'),
  ('The Reeds'), ('Valhalla'), ('Vlakplaats'), ('Wierdapark'),
  ('Wierda Park'), ('Zwartkop')
) as s(name) on true
where c.name = 'Centurion' and p.name = 'Gauteng'
on conflict (city_id, name_key) do nothing;

do $$
declare
  jobs_tagged integer;
  workers_tagged integer;
begin
  update public.jobs
  set city_id = public.resolve_city_for_area(public_area)
  where city_id is null
    and public_area is not null
    and public.resolve_city_for_area(public_area) is not null;
  get diagnostics jobs_tagged = row_count;

  update public.worker_profiles
  set city_id = public.resolve_city_for_area(public_area)
  where city_id is null
    and public_area is not null
    and public.resolve_city_for_area(public_area) is not null;
  get diagnostics workers_tagged = row_count;

  raise notice 'city_id backfill: % jobs and % worker profiles tagged', jobs_tagged, workers_tagged;
end $$;