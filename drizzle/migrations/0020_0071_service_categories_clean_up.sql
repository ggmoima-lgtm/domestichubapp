do $$
declare
  g record;
  keeper uuid;
  dup uuid;
  fk record;
begin
  for g in
    select lower(regexp_replace(name, '[^a-zA-Z]', '', 'g')) as norm
    from public.worker_categories
    group by 1
    having count(*) > 1
  loop
    select c.id into keeper
    from public.worker_categories c
    where lower(regexp_replace(c.name, '[^a-zA-Z]', '', 'g')) = g.norm
    order by
      c.is_active desc,
      (c.sort_order > 0) desc,
      (select count(*) from public.worker_category_memberships m where m.category_id = c.id) desc,
      c.sort_order asc,
      c.created_at asc
    limit 1;

    update public.worker_categories
    set is_active = true
    where id = keeper
      and exists (
        select 1 from public.worker_categories x
        where lower(regexp_replace(x.name, '[^a-zA-Z]', '', 'g')) = g.norm and x.is_active
      );

    for dup in
      select c.id
      from public.worker_categories c
      where lower(regexp_replace(c.name, '[^a-zA-Z]', '', 'g')) = g.norm
        and c.id <> keeper
    loop
      delete from public.worker_category_memberships m
      where m.category_id = dup
        and exists (
          select 1 from public.worker_category_memberships k
          where k.worker_profile_id = m.worker_profile_id and k.category_id = keeper
        );

      for fk in
        select c.conrelid::regclass as tbl, a.attname as col
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        where c.contype = 'f'
          and c.confrelid = 'public.worker_categories'::regclass
          and array_length(c.conkey, 1) = 1
      loop
        execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using keeper, dup;
      end loop;

      update public.worker_categories set is_active = false where id = dup;
    end loop;
  end loop;
end
$$;