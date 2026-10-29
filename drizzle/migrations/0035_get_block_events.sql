create or replace function public.get_block_events(p_other uuid)
 returns table(action text, at timestamptz)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select be.action, be.created_at
  from public.block_events be
  where be.blocker_id = auth.uid() and be.blocked_id = p_other
  order by be.created_at
$function$;