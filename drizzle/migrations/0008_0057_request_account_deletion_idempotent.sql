create or replace function public.request_account_deletion(reason text default null::text, reauthenticated_at timestamp with time zone default null::timestamp with time zone)
 returns account_deletion_requests
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  requester uuid := auth.uid();
  request_row public.account_deletion_requests%rowtype;
begin
  if requester is null then
    raise exception 'Please sign in to request account deletion';
  end if;

  select * into request_row
  from public.account_deletion_requests
  where profile_id = requester and status = 'pending'
  order by requested_at desc
  limit 1;

  if request_row.id is null then
    insert into public.account_deletion_requests (profile_id, reason, reauthenticated_at)
    values (requester, nullif(trim(coalesce(reason, '')), ''), reauthenticated_at)
    returning * into request_row;
  end if;

  update public.profiles
  set status = 'deleted', deleted_at = coalesce(deleted_at, now())
  where id = requester;

  return request_row;
end;
$function$;

revoke all on function public.request_account_deletion(text, timestamp with time zone) from public;
grant execute on function public.request_account_deletion(text, timestamp with time zone) to authenticated;