alter table public.notification_preferences
  add column if not exists responses boolean not null default true,
  add column if not exists request_matches boolean not null default true;

alter table public.job_alerts add column if not exists last_notified_at timestamptz;

create or replace function public.notification_topic_enabled(target uuid, topic text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((
    select case topic
      when 'new_message' then p.messages
      when 'profile_unlock' then p.profile_unlocks
      when 'credit_purchase' then p.credits
      when 'application_submitted' then p.responses
      when 'request_match' then p.request_matches
      else true
    end
    from public.notification_preferences p
    where p.user_id = target
  ), true)
$function$;

revoke all on function public.notification_topic_enabled(uuid, text) from public, anon, authenticated;

create or replace function public.notify_profile(
  target_profile uuid,
  notification_type text,
  title text,
  body text default '',
  channel text default 'in_app',
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_id uuid;
begin
  if not public.notification_topic_enabled(target_profile, notification_type) then
    return null;
  end if;

  insert into public.notifications (profile_id, notification_type, title, body, channel, metadata)
  values (target_profile, notification_type, title, body, channel, metadata)
  returning id into new_id;
  return new_id;
end;
$function$;

revoke all on function public.notify_profile(uuid, text, text, text, text, jsonb) from public;

create or replace function public.get_notification_preferences()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'messages', coalesce(p.messages, true),
    'profileUnlocks', coalesce(p.profile_unlocks, true),
    'responses', coalesce(p.responses, true),
    'requestMatches', coalesce(p.request_matches, true),
    'credits', coalesce(p.credits, true),
    'adminActions', coalesce(p.admin_actions, true)
  )
  from (select 1) as one
  left join public.notification_preferences p on p.user_id = auth.uid()
$function$;

revoke all on function public.get_notification_preferences() from public, anon;
grant execute on function public.get_notification_preferences() to authenticated;

create or replace function public.save_notification_preferences(
  p_messages boolean,
  p_profile_unlocks boolean,
  p_responses boolean,
  p_request_matches boolean,
  p_credits boolean,
  p_admin_actions boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to update notification preferences';
  end if;

  insert into public.notification_preferences (
    user_id, messages, profile_unlocks, responses, request_matches, credits, admin_actions
  )
  values (
    auth.uid(),
    coalesce(p_messages, true), coalesce(p_profile_unlocks, true), coalesce(p_responses, true),
    coalesce(p_request_matches, true), coalesce(p_credits, true), coalesce(p_admin_actions, true)
  )
  on conflict (user_id) do update set
    messages = excluded.messages,
    profile_unlocks = excluded.profile_unlocks,
    responses = excluded.responses,
    request_matches = excluded.request_matches,
    credits = excluded.credits,
    admin_actions = excluded.admin_actions,
    updated_at = now();
end;
$function$;

revoke all on function public.save_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.save_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

create or replace function public.request_matches_alert(job_row public.jobs, alert_row public.job_alerts)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  category_name text;
begin
  if nullif(trim(coalesce(alert_row.category, '')), '') is not null then
    select wc.name into category_name from public.worker_categories wc where wc.id = job_row.category_id;
    if category_name is null or not exists (
      select 1
      from unnest(string_to_array(alert_row.category, ',')) as wanted(label)
      where lower(regexp_replace(wanted.label, '[^a-zA-Z]', '', 'g')) = lower(regexp_replace(category_name, '[^a-zA-Z]', '', 'g'))
    ) then
      return false;
    end if;
  end if;

  if coalesce(cardinality(alert_row.city_ids), 0) > 0 or nullif(trim(coalesce(alert_row.location, '')), '') is not null then
    if not (
      (job_row.city_id is not null and job_row.city_id = any (alert_row.city_ids))
      or exists (
        select 1
        from unnest(string_to_array(alert_row.location, ',')) as place(name)
        where nullif(trim(place.name), '') is not null
          and coalesce(job_row.public_area, '') ilike '%' || trim(place.name) || '%'
      )
    ) then
      return false;
    end if;
  end if;

  if nullif(trim(coalesce(alert_row.employment_type, '')), '') is not null then
    if not exists (
      select 1
      from unnest(string_to_array(alert_row.employment_type, ',')) as wanted(label)
      where lower(regexp_replace(wanted.label, '[^a-zA-Z]', '', 'g')) = lower(regexp_replace(coalesce(job_row.employment_type, ''), '[^a-zA-Z]', '', 'g'))
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$function$;

revoke all on function public.request_matches_alert(public.jobs, public.job_alerts) from public, anon, authenticated;

create or replace function public.notify_matching_request_alerts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  alert_row public.job_alerts%rowtype;
begin
  for alert_row in
    select ja.*
    from public.job_alerts ja
    where ja.paused_at is null
      and ja.frequency = 'Instant'
      and ja.worker_profile_id is distinct from new.employer_profile_id
      and exists (
        select 1 from public.profiles p
        where p.id = ja.worker_profile_id and coalesce(p.status::text, 'active') = 'active' and p.deleted_at is null
      )
  loop
    if public.request_matches_alert(new, alert_row) then
      perform public.notify_profile(
        alert_row.worker_profile_id,
        'request_match',
        'New request matches your alert',
        coalesce(nullif(new.title, ''), 'A new service request') || ' has just been posted.',
        'in_app',
        jsonb_build_object('jobId', new.id, 'alertId', alert_row.id)
      );
    end if;
  end loop;
  return new;
exception when others then
  return new;
end;
$function$;

revoke all on function public.notify_matching_request_alerts() from public, anon, authenticated;

drop trigger if exists jobs_alerts_on_insert on public.jobs;
create trigger jobs_alerts_on_insert
after insert on public.jobs
for each row when (new.status::text = 'published')
execute function public.notify_matching_request_alerts();

drop trigger if exists jobs_alerts_on_publish on public.jobs;
create trigger jobs_alerts_on_publish
after update of status on public.jobs
for each row when (old.status::text is distinct from 'published' and new.status::text = 'published')
execute function public.notify_matching_request_alerts();

create or replace function public.send_request_alert_digests()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  alert_row public.job_alerts%rowtype;
  period interval;
  since timestamptz;
  matched integer;
  sent integer := 0;
begin
  for alert_row in
    select ja.* from public.job_alerts ja
    where ja.paused_at is null and ja.frequency in ('Daily', 'Weekly', 'Monthly')
  loop
    period := case alert_row.frequency
      when 'Weekly' then interval '7 days'
      when 'Monthly' then interval '1 month'
      else interval '1 day'
    end;
    since := coalesce(alert_row.last_notified_at, alert_row.created_at);
    if since > now() - period then
      continue;
    end if;

    select count(*) into matched
    from public.jobs j
    where j.status::text = 'published'
      and j.created_at > since
      and j.employer_profile_id is distinct from alert_row.worker_profile_id
      and public.request_matches_alert(j, alert_row);

    if matched > 0 then
      perform public.notify_profile(
        alert_row.worker_profile_id,
        'request_match',
        case when matched = 1 then '1 new request matches your alert' else matched || ' new requests match your alert' end,
        'Open Request alerts to see what is new.',
        'in_app',
        jsonb_build_object('alertId', alert_row.id, 'count', matched)
      );
      sent := sent + 1;
    end if;

    update public.job_alerts set last_notified_at = now() where id = alert_row.id;
  end loop;
  return sent;
end;
$function$;

revoke all on function public.send_request_alert_digests() from public, anon, authenticated;