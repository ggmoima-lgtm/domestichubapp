insert into public.worker_categories (slug, name, description, is_active, sort_order)
select 'electrician', 'Electrician', 'Electrical repairs and installations', true,
       coalesce((select max(sort_order) from public.worker_categories), 0) + 1
where not exists (select 1 from public.worker_categories where slug = 'electrician');

alter table public.worker_profiles
  add column if not exists contact_sharing_consent boolean,
  add column if not exists contact_sharing_decided_at timestamptz;

do $$
declare
  existing record;
begin
  for existing in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.worker_profiles'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%valid_sa_id%'
  loop
    execute format('alter table public.worker_profiles drop constraint %I', existing.conname);
  end loop;
end
$$;

alter table public.worker_profiles
  add constraint worker_profiles_documentation_declaration_check
  check (
    documentation_declaration is null
    or documentation_declaration in (
      'valid_sa_id','passport_work_authorisation','other_lawful_documentation',
      'no_documentation','prefer_not_to_disclose','confirmed_legally_permitted'
    )
  );

create or replace function public.set_contact_sharing_consent(p_consent boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Please sign in';
  end if;
  if p_consent is null then
    raise exception 'A yes or no answer is required';
  end if;
  update public.worker_profiles
  set contact_sharing_consent = p_consent,
      contact_sharing_decided_at = now()
  where profile_id = auth.uid();
  if not found then
    raise exception 'Only service providers can set this';
  end if;
  return p_consent;
end;
$function$;

revoke all on function public.set_contact_sharing_consent(boolean) from public, anon;
grant execute on function public.set_contact_sharing_consent(boolean) to authenticated;

create or replace function public.get_unlocked_provider_contact(worker uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  customer uuid := auth.uid();
  active_unlock public.profile_unlocks%rowtype;
  consent boolean;
  provider_phone text;
  provider_email text;
begin
  if customer is null then
    raise exception 'Please sign in';
  end if;

  select * into active_unlock
  from public.profile_unlocks pu
  where pu.employer_id = customer
    and pu.helper_id = worker
    and pu.expires_at > now()
  order by pu.expires_at desc
  limit 1;

  if active_unlock.id is null then
    return jsonb_build_object('unlocked', false, 'shared', false);
  end if;

  select coalesce(wp.contact_sharing_consent, false), p.phone_e164, p.email
  into consent, provider_phone, provider_email
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.profile_id
  where wp.profile_id = worker;

  return jsonb_build_object(
    'unlocked', true,
    'shared', coalesce(consent, false),
    'phone', case when coalesce(consent, false) then nullif(provider_phone, '') end,
    'email', case when coalesce(consent, false) then nullif(provider_email, '') end,
    'expiresAt', active_unlock.expires_at
  );
end;
$function$;

revoke all on function public.get_unlocked_provider_contact(uuid) from public, anon;
grant execute on function public.get_unlocked_provider_contact(uuid) to authenticated;