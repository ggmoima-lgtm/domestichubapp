create or replace function public.start_unlocked_conversation(worker uuid, related_job uuid default null::uuid, related_application uuid default null::uuid)
 returns conversations
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  active_unlock public.profile_unlocks%rowtype;
  conversation public.conversations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || worker::text || ':conversation', 0));

  if worker = auth.uid() then
    raise exception 'Employers cannot message their own worker profile';
  end if;

  if not exists (select 1 from public.employer_profiles ep where ep.profile_id = auth.uid()) then
    raise exception 'Only employers can start a worker conversation';
  end if;

  if not public.is_profile_active(auth.uid()) or not public.is_profile_active(worker) then
    raise exception 'Conversation is not available for inactive accounts';
  end if;

  if public.is_blocked_between(auth.uid(), worker) then
    raise exception 'Conversation is not permitted between blocked users';
  end if;

  select * into active_unlock
  from public.profile_unlocks pu
  where pu.employer_id = auth.uid()
    and pu.helper_id = worker
    and pu.expires_at > now()
  order by pu.expires_at desc
  limit 1;

  if active_unlock.id is null then
    raise exception 'Unlock this profile to message this worker';
  end if;

  select * into conversation
  from public.conversations c
  where c.employer_profile_id = auth.uid()
    and c.worker_profile_id = worker
    and c.status <> 'deleted'
  order by c.created_at desc
  limit 1;

  if conversation.id is null then
    insert into public.conversations (
      job_id, related_application_id, employer_profile_id, worker_profile_id,
      created_from_unlock_id, last_message_at, status
    ) values (
      related_job, related_application, auth.uid(), worker, active_unlock.id, now(), 'active'
    )
    returning * into conversation;
  else
    update public.conversations
    set status = 'active', archived_at = null
    where id = conversation.id
    returning * into conversation;
  end if;

  insert into public.conversation_members (conversation_id, profile_id, role, last_read_at)
  values
    (conversation.id, auth.uid(), 'user', now()),
    (conversation.id, worker, 'user', null)
  on conflict (conversation_id, profile_id)
  do update set archived_at = null;

  return conversation;
end;
$function$;

grant execute on function public.start_unlocked_conversation(uuid, uuid, uuid) to authenticated, service_role;