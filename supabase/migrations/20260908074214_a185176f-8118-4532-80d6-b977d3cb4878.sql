create or replace function public.create_job_application(job_id uuid, message text default '')
returns public.job_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  worker uuid := auth.uid();
  job_row public.jobs%rowtype;
  application public.job_applications%rowtype;
begin
  if worker is null then
    raise exception 'Please sign in to apply for jobs';
  end if;

  if not exists (select 1 from public.worker_profiles wp where wp.profile_id = worker) then
    raise exception 'Complete your worker profile before applying for jobs';
  end if;

  select * into job_row from public.jobs j where j.id = job_id;

  if job_row.id is null then
    raise exception 'This job could not be found';
  end if;

  if job_row.status <> 'published' then
    raise exception 'This job is no longer accepting applications';
  end if;

  -- Idempotent: re-submitting to a job you already applied for returns the
  -- existing application rather than creating a duplicate or erroring.
  select * into application
  from public.job_applications ja
  where ja.job_id = job_id and ja.helper_id = worker
  limit 1;

  if application.id is not null then
    return application;
  end if;

  insert into public.job_applications (job_id, helper_id, status, message)
  values (job_id, worker, 'submitted', nullif(trim(coalesce(message, '')), ''))
  returning * into application;

  perform public.notify_profile(
    job_row.employer_profile_id,
    'application_submitted',
    'New application received',
    'A worker applied to your job posting.',
    'in_app',
    jsonb_build_object('jobId', job_id, 'applicationId', application.id)
  );

  return application;
end;
$function$;

revoke all on function public.create_job_application(uuid, text) from public;
grant execute on function public.create_job_application(uuid, text) to authenticated;

create or replace function public.shortlist_application(application_id uuid)
returns public.job_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  employer uuid := auth.uid();
  application public.job_applications%rowtype;
begin
  if employer is null then
    raise exception 'Please sign in to continue';
  end if;

  select ja.* into application
  from public.job_applications ja
  join public.jobs j on j.id = ja.job_id
  where ja.id = application_id
    and j.employer_profile_id = employer;

  if application.id is null then
    raise exception 'Application not found';
  end if;

  update public.job_applications
  set status = 'shortlisted', updated_at = now()
  where id = application.id
  returning * into application;

  perform public.notify_profile(
    application.helper_id,
    'shortlisted',
    'You have been shortlisted',
    'An employer shortlisted your application. Check Messages if they reach out.',
    'in_app',
    jsonb_build_object('jobId', application.job_id, 'applicationId', application.id)
  );

  return application;
end;
$function$;

revoke all on function public.shortlist_application(uuid) from public;
grant execute on function public.shortlist_application(uuid) to authenticated;