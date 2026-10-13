create or replace function public.purge_deleted_account(
  p_profile_id uuid,
  p_dry_run boolean default true,
  p_grace_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles%rowtype;
  v_request public.account_deletion_requests%rowtype;
  v_user uuid;
  v_phones text[];
  v_helper_ids uuid[];
  v_conversations uuid[];
  v_kept uuid[];
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
  v_rule record;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile.id is null then
    raise exception 'profile_not_found';
  end if;
  if v_profile.status <> 'deleted' then
    raise exception 'profile_not_deleted';
  end if;

  select * into v_request
  from public.account_deletion_requests
  where profile_id = p_profile_id and status = 'pending'
  order by requested_at desc
  limit 1;
  if v_request.id is null then
    raise exception 'no_pending_request';
  end if;
  if not p_dry_run and v_request.requested_at > now() - make_interval(days => p_grace_days) then
    raise exception 'grace_period_not_over';
  end if;

  v_user := coalesce(v_profile.user_id, v_profile.id);
  v_phones := array_remove(array[v_profile.phone, v_profile.phone_e164], null);

  select coalesce(array_agg(id), '{}') into v_helper_ids from public.helpers where user_id = v_user;

  select coalesce(array_agg(c.id), '{}') into v_kept
  from public.conversations c
  where (c.employer_profile_id = p_profile_id or c.worker_profile_id = p_profile_id)
    and exists (
      select 1
      from public.user_reports r
      where lower(coalesce(r.status, '')) not in ('resolved', 'dismissed', 'closed', 'rejected', 'withdrawn', 'actioned')
        and (
          (r.reporter_id in (p_profile_id, v_user)
            and r.reported_user_id = case when c.employer_profile_id = p_profile_id then c.worker_profile_id else c.employer_profile_id end)
          or
          (r.reported_user_id in (p_profile_id, v_user)
            and r.reporter_id = case when c.employer_profile_id = p_profile_id then c.worker_profile_id else c.employer_profile_id end)
        )
    );

  select coalesce(array_agg(c.id), '{}') into v_conversations
  from public.conversations c
  where (c.employer_profile_id = p_profile_id or c.worker_profile_id = p_profile_id)
    and c.id <> all(v_kept);

  v_counts := jsonb_build_object('kept_reported_conversations', cardinality(v_kept));

  begin
    for v_rule in
      select * from (values
        (1,  'saved_jobs',                  'user_id = $1'),
        (2,  'job_alerts',                  'worker_profile_id = $2'),
        (3,  'saved_worker_profiles',       'employer_profile_id = $2 or worker_profile_id = $2'),
        (4,  'saved_helpers',               'employer_id = $2 or helper_id = $2 or helper_id = any($3)'),
        (5,  'notifications',               'profile_id = $2'),
        (6,  'notification_preferences',    'user_id = $1'),
        (7,  'push_tokens',                 'user_id = $1'),
        (8,  'onboarding_sessions',         'profile_id = $2'),
        (9,  'profile_pin_credentials',     'profile_id = $2'),
        (10, 'otp_codes',                   'user_id = $1 or phone = any($5)'),
        (11, 'worker_documents',            'worker_profile_id = $2'),
        (12, 'worker_qualifications',       'worker_profile_id = $2'),
        (13, 'worker_references',           'worker_profile_id = $2'),
        (14, 'worker_skills',               'worker_profile_id = $2'),
        (15, 'worker_work_experiences',     'worker_profile_id = $2'),
        (16, 'worker_availability',         'worker_profile_id = $2'),
        (17, 'worker_category_memberships', 'worker_profile_id = $2'),
        (18, 'badge_awards',                'helper_id = $2 or helper_id = any($3)'),
        (19, 'video_flags',                 'helper_id = $2 or helper_id = any($3)'),
        (20, 'reviews',                     'employer_id = $2 or helper_id = $2 or helper_id = any($3)'),
        (21, 'placements',                  'employer_id = $2 or helper_id = $2 or helper_id = any($3)'),
        (22, 'helper_sensitive_data',       'helper_id = any($3)'),
        (23, 'job_applications',            'helper_id = $2'),
        (24, 'messages',                    'conversation_id = any($4) or ((sender_id = $1 or receiver_id = $1 or sender_profile_id = $2 or helper_id = any($3)) and (conversation_id is null or conversation_id <> all($6)))'),
        (25, 'conversation_members',        'conversation_id = any($4) or (profile_id = $2 and conversation_id <> all($6))'),
        (26, 'conversations',               'id = any($4)'),
        (27, 'helpers',                     'user_id = $1')
      ) as rules(step, table_name, condition)
      order by step
    loop
      execute format('delete from public.%I where %s', v_rule.table_name, v_rule.condition)
        using v_user, p_profile_id, v_helper_ids, v_conversations, v_phones, v_kept;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('delete_' || v_rule.table_name, v_n);
    end loop;

    update public.profiles
    set full_name = 'Deleted user', first_name = 'Deleted', last_name = 'user', surname = null,
        phone = null, phone_e164 = null, email = null, city = null, area = null,
        date_of_birth = null, pin_hash = null, pin_set_at = null,
        email_verified_at = null, phone_verified_at = null, user_id = null,
        status = 'deleted', deleted_at = coalesce(deleted_at, now())
    where id = p_profile_id;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('blank_profiles', v_n);

    update public.worker_profiles
    set public_area = null, private_exact_area = null, biography = null, expected_salary = null,
        skills_text = null, documentation_declaration = null, documentation_declared_at = null,
        profile_photo_path = null, profile_photo_url = null,
        intro_video_path = null, intro_video_url = null,
        introduction_video_path = null, introduction_video_url = null,
        introduction_photo_path = null, introduction_photo_url = null,
        salary_type = null, gender = null, nationality = null, travel_radius = null,
        work_arrangement = null, expected_rate_min = null, expected_rate_max = null,
        city_id = null, searchable_at = null, published_at = null,
        last_availability_confirmed_at = null,
        languages = '{}', status = 'not_looking', profile_completion = 0
    where profile_id = p_profile_id;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('blank_worker_profiles', v_n);

    update public.employer_profiles
    set location = null, type_of_need = null, email = null, full_name = null, category = null,
        availability = null, custom_notes = null, latitude = null, longitude = null,
        suburb = null, city = null, province = null, country = null,
        formatted_address = null, place_id = null, date_of_birth = null, avatar_url = null,
        public_area = null, private_exact_address = null, city_id = null
    where profile_id = p_profile_id;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('blank_employer_profiles', v_n);

    update public.jobs
    set status = 'deleted', private_exact_address = null, duties = null
    where employer_profile_id = p_profile_id;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('close_jobs', v_n);

    update public.support_tickets
    set subject = '[deleted]', message = '[deleted]'
    where requester_profile_id = p_profile_id;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('redact_support_tickets', v_n);

    update public.account_deletion_requests
    set status = 'completed'
    where id = v_request.id;
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('complete_request', v_n);

    if p_dry_run then
      raise exception 'dry_run_rollback' using errcode = 'DR001';
    end if;
  exception
    when sqlstate 'DR001' then
      null;
  end;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'profile_id', p_profile_id,
    'auth_user_id', v_user,
    'counts', v_counts
  );
end;
$function$;

revoke all on function public.purge_deleted_account(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.purge_deleted_account(uuid, boolean, integer) to service_role;