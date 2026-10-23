create or replace function public.get_tab_badge_counts(
  p_responses_since timestamptz default null,
  p_alerts_since timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_responses integer := 0;
  v_alerts integer := 0;
begin
  if v_user is null then
    return jsonb_build_object('responses', 0, 'alerts', 0);
  end if;

  select count(*) into v_responses
  from public.job_applications a
  join public.jobs j on j.id = a.job_id
  where j.employer_profile_id = v_user
    and j.status::text <> 'deleted'
    and a.status::text <> 'withdrawn'
    and (p_responses_since is null or a.created_at > p_responses_since);

  select count(*) into v_alerts
  from public.jobs j
  where j.status::text = 'published'
    and j.created_at > greatest(coalesce(p_alerts_since, '-infinity'::timestamptz), now() - interval '30 days')
    and j.employer_profile_id is distinct from v_user
    and exists (
      select 1
      from public.job_alerts ja
      where ja.worker_profile_id = v_user
        and ja.paused_at is null
        and public.request_matches_alert(j, ja)
    );

  return jsonb_build_object('responses', v_responses, 'alerts', v_alerts);
end;
$function$;

revoke all on function public.get_tab_badge_counts(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_tab_badge_counts(timestamptz, timestamptz) to authenticated;