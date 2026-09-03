create or replace function public.get_worker_unlock_state(worker uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  employer uuid := auth.uid();
  wallet public.credit_wallets%rowtype;
  active_unlock public.profile_unlocks%rowtype;
  expired_unlock public.profile_unlocks%rowtype;
  full_profile jsonb;
  worker_documents_json jsonb;
begin
  if employer is null then
    raise exception 'Please sign in before opening worker profiles';
  end if;

  if worker is null then
    raise exception 'Worker profile is required';
  end if;

  if worker = employer then
    raise exception 'Employers cannot unlock their own profile';
  end if;

  if not exists (select 1 from public.employer_profiles ep where ep.profile_id = employer) then
    raise exception 'Only employers can unlock worker profiles';
  end if;

  if not exists (
    select 1
    from public.worker_profiles wp
    join public.profiles p on p.id = wp.profile_id
    where wp.profile_id = worker
      and wp.status::text in ('active_available', 'temporarily_unavailable', 'hired', 'not_looking')
      and coalesce(p.status, 'active') = 'active'
      and p.deleted_at is null
  ) then
    raise exception 'Worker profile is not available for unlock';
  end if;

  wallet := public.ensure_employer_wallet(employer);

  select * into active_unlock
  from public.profile_unlocks pu
  where pu.employer_id = employer
    and pu.helper_id = worker
    and pu.expires_at > now()
  order by pu.expires_at desc
  limit 1;

  if active_unlock.id is not null then
    select coalesce(
      jsonb_agg(jsonb_build_object('id', wd.id, 'documentType', wd.document_type) order by wd.created_at),
      '[]'::jsonb
    )
    into worker_documents_json
    from public.worker_documents wd
    where wd.worker_profile_id = worker;

    select jsonb_build_object(
      'workerProfileId', wp.profile_id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'publicArea', wp.public_area,
      'biography', wp.biography,
      'yearsExperience', wp.years_experience,
      'expectedRateMin', wp.expected_rate_min,
      'expectedRateMax', wp.expected_rate_max,
      'ownTransport', wp.vehicle_available,
      'driverLicence', wp.driver_licence,
      'profilePhotoUrl', wp.profile_photo_url,
      'introVideoUrl', wp.intro_video_url,
      'documentationDeclaration', wp.documentation_declaration,
      'documentationDeclaredAt', wp.documentation_declared_at,
      'documentationTermsVersion', wp.documentation_terms_version,
      'documents', worker_documents_json
    )
    into full_profile
    from public.worker_profiles wp
    join public.profiles p on p.id = wp.profile_id
    where wp.profile_id = worker;

    return jsonb_build_object(
      'status', 'unlocked',
      'isUnlocked', true,
      'isExpired', false,
      'creditBalance', wallet.balance,
      'unlockId', active_unlock.id,
      'unlockExpiresAt', active_unlock.expires_at,
      'unlock', to_jsonb(active_unlock),
      'fullProfile', full_profile
    );
  end if;

  select * into expired_unlock
  from public.profile_unlocks pu
  where pu.employer_id = employer
    and pu.helper_id = worker
    and pu.expires_at <= now()
  order by pu.expires_at desc
  limit 1;

  return jsonb_build_object(
    'status',
    case
      when expired_unlock.id is not null then 'expired'
      when wallet.balance >= 1 then 'locked_with_credits'
      else 'locked_no_credits'
    end,
    'isUnlocked', false,
    'isExpired', expired_unlock.id is not null,
    'creditBalance', wallet.balance,
    'unlockId', expired_unlock.id,
    'unlockExpiresAt', expired_unlock.expires_at,
    'unlock', case when expired_unlock.id is null then null else to_jsonb(expired_unlock) end,
    'fullProfile', null
  );
end;
$$;

grant execute on function public.get_worker_unlock_state(uuid) to authenticated;
revoke execute on function public.get_worker_unlock_state(uuid) from anon;
revoke execute on function public.get_worker_unlock_state(uuid) from public;