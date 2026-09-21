do $$
declare
  target text;
  fk record;
begin
  foreach target in array array['job_applications', 'conversations'] loop
    for fk in
      select
        c.conname,
        c.confrelid::regclass::text as used_to_point_at,
        case c.confdeltype
          when 'c' then 'on delete cascade'
          when 'n' then 'on delete set null'
          when 'd' then 'on delete set default'
          when 'r' then 'on delete restrict'
          else 'on delete no action'
        end as delete_rule
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.conrelid = ('public.' || target)::regclass
        and c.contype = 'f'
        and array_length(c.conkey, 1) = 1
        and a.attname = 'job_id'
        and c.confrelid <> 'public.jobs'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', target, fk.conname);
      execute format(
        'alter table public.%I add constraint %I foreign key (job_id) references public.jobs(id) %s not valid',
        target,
        fk.conname,
        fk.delete_rule
      );
      raise notice 'repointed public.%.% from % to public.jobs', target, fk.conname, fk.used_to_point_at;
    end loop;
  end loop;
end $$;