create or replace function public.withdraw_job_application(p_application_id uuid)
returns public.job_applications
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_application public.job_applications;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to withdraw an application';
  end if;

  update public.job_applications ja
  set status = 'withdrawn',
      updated_at = now()
  where ja.id = p_application_id
    and ja.status::text <> 'withdrawn'
    and ja.helper_id in (
      select wp.profile_id
      from public.worker_profiles wp
      join public.profiles p on p.id = wp.profile_id
      where p.user_id = auth.uid()
    )
  returning * into v_application;

  if v_application.id is null then
    raise exception 'Application not found or already withdrawn';
  end if;

  return v_application;
end;
$function$;

revoke all on function public.withdraw_job_application(uuid) from public;
grant execute on function public.withdraw_job_application(uuid) to authenticated;