-- Repoint the two employer policies on job_applications away from the legacy job_posts table
-- and onto the current jobs table (ownership via employer_profiles.profile_id).
drop policy if exists "Employers can view applications for their jobs" on public.job_applications;
drop policy if exists "Employers can update application status" on public.job_applications;

create policy "Employers can view applications for their jobs"
  on public.job_applications
  for select
  using (
    job_id in (
      select j.id
      from public.jobs j
      join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
      where ep.user_id = auth.uid()
    )
  );

create policy "Employers can update application status"
  on public.job_applications
  for update
  using (
    job_id in (
      select j.id
      from public.jobs j
      join public.employer_profiles ep on ep.profile_id = j.employer_profile_id
      where ep.user_id = auth.uid()
    )
  );

-- Drop the legacy job_posts table only if it is empty (user-supplied script, verbatim).
do $$
begin
  if to_regclass('public.job_posts') is not null then
    if (select count(*) from public.job_posts) > 0 then
      raise exception 'job_posts still has rows - not dropping it';
    end if;
    drop table public.job_posts;
  end if;
end $$;