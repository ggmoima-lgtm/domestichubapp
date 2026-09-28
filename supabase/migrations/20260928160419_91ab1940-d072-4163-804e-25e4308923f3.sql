alter table public.job_applications
  drop constraint if exists job_applications_helper_id_fkey;

alter table public.job_applications
  add constraint job_applications_helper_id_fkey
  foreign key (helper_id)
  references public.worker_profiles (profile_id)
  on delete cascade;

drop policy if exists "Helpers can apply to jobs" on public.job_applications;
create policy "Helpers can apply to jobs" on public.job_applications
  for insert to authenticated
  with check (
    helper_id in (
      select wp.profile_id
      from public.worker_profiles wp
      join public.profiles p on p.id = wp.profile_id
      where p.user_id = auth.uid()
    )
  );

drop policy if exists "Helpers can view their applications" on public.job_applications;
create policy "Helpers can view their applications" on public.job_applications
  for select to authenticated
  using (
    helper_id in (
      select wp.profile_id
      from public.worker_profiles wp
      join public.profiles p on p.id = wp.profile_id
      where p.user_id = auth.uid()
    )
  );