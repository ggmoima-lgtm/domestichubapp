create or replace function public.block_profile(blocked uuid, reason text default null::text)
 returns blocked_users
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  blocker uuid := auth.uid();
  block_row public.blocked_users%rowtype;
begin
  if blocker is null then
    raise exception 'Please sign in to block a profile';
  end if;
  if blocked is null then
    raise exception 'A profile to block is required';
  end if;
  if blocked = blocker then
    raise exception 'You cannot block yourself';
  end if;

  select * into block_row
  from public.blocked_users
  where blocker_id = blocker and blocked_id = blocked;

  if block_row.id is not null then
    return block_row;
  end if;

  insert into public.blocked_users (blocker_id, blocked_id)
  values (blocker, blocked)
  returning * into block_row;

  insert into public.block_events (blocker_id, blocked_id, action)
  values (blocker, blocked, 'blocked');

  return block_row;
end;
$function$;