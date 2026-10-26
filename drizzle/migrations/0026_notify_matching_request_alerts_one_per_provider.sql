create or replace function public.notify_matching_request_alerts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  alert_row public.job_alerts%rowtype;
begin
  -- distinct on: the provider's oldest matching alert speaks for all of them.
  for alert_row in
    select distinct on (ja.worker_profile_id) ja.*
    from public.job_alerts ja
    join public.worker_profiles wp on wp.profile_id = ja.worker_profile_id
    where ja.paused_at is null
      and ja.frequency = 'Instant'
      and ja.worker_profile_id is distinct from new.employer_profile_id
      and wp.status in ('active_available', 'temporarily_unavailable')
      and exists (
        select 1 from public.profiles p
        where p.id = ja.worker_profile_id and coalesce(p.status::text, 'active') = 'active' and p.deleted_at is null
      )
      and public.request_matches_alert(new, ja)
    order by ja.worker_profile_id, ja.created_at
  loop
    perform public.notify_profile(
      alert_row.worker_profile_id,
      'request_match',
      'New request matches your alert',
      coalesce(nullif(new.title, ''), 'A new service request') || ' has just been posted.',
      'in_app',
      jsonb_build_object('jobId', new.id, 'alertId', alert_row.id)
    );
  end loop;
  return new;
exception when others then
  return new;
end;
$function$;

revoke all on function public.notify_matching_request_alerts() from public, anon, authenticated;