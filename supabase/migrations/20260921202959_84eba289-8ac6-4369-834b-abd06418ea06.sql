do $$

declare

  target text;

  fk record;

begin

  foreach target in array array['job_applications', 'conversations'] loop

    for fk in

      select c.conname, c.conkey[1] as job_id_attnum, c.confrelid::regclass::text as used_to_point_at

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

        'alter table public.%I add constraint %I foreign key (job_id) references public.jobs(id) on delete cascade not valid',

        target,

        fk.conname

      );

      raise notice 'repointed public.%.% from % to public.jobs', target, fk.conname, fk.used_to_point_at;

    end loop;

  end loop;

end $$;