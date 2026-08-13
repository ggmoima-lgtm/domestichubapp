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
      'documentationTermsVersion', wp.documentation_terms_version
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

drop function if exists public.unlock_worker_profile(uuid);

create or replace function public.unlock_worker_profile(worker uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  employer uuid := auth.uid();
  wallet public.credit_wallets%rowtype;
  existing_unlock public.profile_unlocks%rowtype;
  ledger_row public.credit_transactions%rowtype;
  unlock_row public.profile_unlocks%rowtype;
  balance_before integer;
  balance_after integer;
begin
  if employer is null then
    raise exception 'Please sign in before unlocking worker profiles';
  end if;

  if worker is null then
    raise exception 'Worker profile is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(employer::text || ':' || worker::text, 0));

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

  select * into existing_unlock
  from public.profile_unlocks
  where employer_id = employer
    and helper_id = worker
    and expires_at > now()
  order by expires_at desc
  limit 1;

  wallet := public.ensure_employer_wallet(employer);
  balance_before := wallet.balance;

  if existing_unlock.id is not null then
    return jsonb_build_object(
      'success', true,
      'alreadyUnlocked', true,
      'creditsUsed', 0,
      'balanceBefore', balance_before,
      'balanceAfter', balance_before,
      'creditBalance', balance_before,
      'newBalance', balance_before,
      'unlockId', existing_unlock.id,
      'expiresAt', existing_unlock.expires_at,
      'unlock', to_jsonb(existing_unlock)
    );
  end if;

  ledger_row := public.apply_credit_ledger_entry(
    employer,
    'unlock_debit',
    -1,
    'Worker profile unlock',
    worker,
    employer,
    null
  );

  insert into public.profile_unlocks (
    employer_id,
    helper_id,
    amount_paid,
    bundle_type,
    unlocked_at,
    expires_at
  )
  values (
    employer,
    worker,
    1,
    'credit',
    now(),
    now() + interval '30 days'
  )
  returning * into unlock_row;

  balance_after := ledger_row.balance_after;

  return jsonb_build_object(
    'success', true,
    'alreadyUnlocked', false,
    'creditsUsed', 1,
    'balanceBefore', balance_before,
    'balanceAfter', balance_after,
    'creditBalance', balance_after,
    'newBalance', balance_after,
    'unlockId', unlock_row.id,
    'expiresAt', unlock_row.expires_at,
    'unlock', to_jsonb(unlock_row)
  );
end;
$$;

grant execute on function public.get_worker_unlock_state(uuid) to authenticated;
grant execute on function public.unlock_worker_profile(uuid) to authenticated;
revoke execute on function public.ensure_employer_wallet(uuid) from anon, authenticated;
revoke execute on function public.apply_credit_ledger_entry(uuid, text, integer, text, uuid, uuid, uuid) from anon, authenticated;