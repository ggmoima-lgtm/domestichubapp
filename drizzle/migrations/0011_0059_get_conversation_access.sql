create or replace function public.get_conversation_access(p_conversation uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to open this conversation';
  end if;

  if not public.is_conversation_member(p_conversation) then
    raise exception 'Only conversation members can open this conversation';
  end if;

  select max(pu.expires_at) into v_expires
  from public.conversations c
  join public.profile_unlocks pu
    on pu.employer_id = c.employer_profile_id
   and pu.helper_id = c.worker_profile_id
  where c.id = p_conversation;

  return jsonb_build_object(
    'active', coalesce(v_expires > now(), false),
    'expiresAt', v_expires
  );
end;
$function$;

revoke all on function public.get_conversation_access(uuid) from public, anon;
grant execute on function public.get_conversation_access(uuid) to authenticated;