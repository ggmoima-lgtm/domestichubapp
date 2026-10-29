create or replace function public.unblock_profile(p_blocked uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  me uuid := auth.uid();
  removed integer;
begin
  if me is null then
    raise exception 'Please sign in to unblock a profile';
  end if;
  if p_blocked is null then
    raise exception 'A profile to unblock is required';
  end if;

  delete from public.blocked_users where blocker_id = me and blocked_id = p_blocked;
  get diagnostics removed = row_count;

  if removed > 0 then
    insert into public.block_events (blocker_id, blocked_id, action)
    values (me, p_blocked, 'unblocked');
  end if;
end;
$function$;