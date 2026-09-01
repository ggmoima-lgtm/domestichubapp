create or replace function public.publish_job(p_job_id uuid)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_employer_profile_id uuid;
  v_job public.jobs;
begin
  select id into v_profile_id from public.profiles where user_id = auth.uid();
  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  select profile_id into v_employer_profile_id
  from public.employer_profiles
  where profile_id = v_profile_id;
  if v_employer_profile_id is null then
    raise exception 'not_an_employer';
  end if;

  update public.jobs
  set status = 'published', updated_at = now()
  where id = p_job_id
    and employer_profile_id = v_employer_profile_id
    and status = 'draft'
  returning * into v_job;

  if v_job.id is null then
    raise exception 'job_not_found_or_not_publishable';
  end if;

  return v_job;
end;
$$;

revoke all on function public.publish_job(uuid) from public, anon;
grant execute on function public.publish_job(uuid) to authenticated;