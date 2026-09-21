do $$

declare
  job_id_attnum smallint;
  fk record;
begin
  select a.attnum into job_id_attnum
  from pg_attribute a
  where a.attrelid = 'public.saved_jobs'::regclass
    and a.attname = 'job_id'
    and not a.attisdropped;

  if job_id_attnum is null then
    raise exception 'saved_jobs has no job_id column';
  end if;

  for fk in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.saved_jobs'::regclass
      and c.contype = 'f'
      and c.conkey = array[job_id_attnum]
      and c.confrelid <> 'public.jobs'::regclass
  loop
    execute format('alter table public.saved_jobs drop constraint %I', fk.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.saved_jobs'::regclass
      and c.contype = 'f'
      and c.conkey = array[job_id_attnum]
      and c.confrelid = 'public.jobs'::regclass
  ) then
    alter table public.saved_jobs
      add constraint saved_jobs_job_id_fkey
      foreign key (job_id) references public.jobs(id) on delete cascade
      not valid;
  end if;
end $$;