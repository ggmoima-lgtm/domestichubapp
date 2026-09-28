create or replace function public.list_public_job_areas()
returns table(public_area text, job_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select j.public_area, count(*) as job_count
  from public.jobs j
  where auth.uid() is not null
    and j.status = 'published'
    and coalesce(trim(j.public_area), '') <> ''
  group by j.public_area
  order by j.public_area asc
$function$;
revoke all on function public.list_public_job_areas() from public, anon;
grant execute on function public.list_public_job_areas() to authenticated, service_role;