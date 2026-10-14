CREATE OR REPLACE FUNCTION public.get_authorized_conversations()
 RETURNS TABLE(id uuid, other_profile_id uuid, other_name text, other_role text, context text,
               status text, last_message_preview text, last_message_at timestamptz,
               unread_count integer, muted boolean, archived boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH visible_conversations AS (
    SELECT c.*, cm.muted_at AS member_muted_at, cm.archived_at AS member_archived_at
    FROM public.conversations c
    JOIN public.conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.profile_id = auth.uid() AND cm.archived_at IS NULL AND c.status <> 'deleted'
  ),
  other_members AS (
    SELECT vc.id AS conversation_id, cm.profile_id
    FROM visible_conversations vc
    JOIN public.conversation_members cm ON cm.conversation_id = vc.id AND cm.profile_id <> auth.uid()
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.body, m.created_at
    FROM public.messages m
    JOIN visible_conversations vc ON vc.id = m.conversation_id
    WHERE m.deleted_at IS NULL
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT
    vc.id,
    om.profile_id,
    trim(coalesce(p.first_name, p.full_name, '') || ' ' || left(coalesce(p.last_name, p.surname, ''), 1) || CASE WHEN coalesce(p.last_name, p.surname, '') = '' THEN '' ELSE '.' END),
    coalesce(p.primary_role, p.role)::text,
    coalesce(j.title || CASE WHEN j.public_area IS NULL THEN '' ELSE ' - ' || j.public_area END, 'Profile connection'),
    vc.status,
    coalesce(lm.body, 'Start the conversation inside Domestic Hub.'),
    coalesce(lm.created_at, vc.last_message_at, vc.created_at),
    (
      SELECT count(*)::integer FROM public.messages unread
      WHERE unread.conversation_id = vc.id
        AND unread.sender_profile_id <> auth.uid()
        AND unread.read_at IS NULL
        AND unread.deleted_at IS NULL
    ),
    vc.member_muted_at IS NOT NULL,
    vc.member_archived_at IS NOT NULL
  FROM visible_conversations vc
  JOIN other_members om ON om.conversation_id = vc.id
  JOIN public.profiles p ON p.id = om.profile_id
  LEFT JOIN last_messages lm ON lm.conversation_id = vc.id
  LEFT JOIN public.jobs j ON j.id = vc.job_id
  WHERE public.is_profile_active(auth.uid())
    AND public.is_profile_active(om.profile_id)
    AND NOT public.is_blocked_between(auth.uid(), om.profile_id)
    -- A worker only sees a conversation once the employer has actually sent
    -- something. An unlock opens an empty conversation for the employer; the
    -- worker must not see who unlocked them, or be able to start it.
    AND (
      vc.worker_profile_id IS DISTINCT FROM auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.messages first_message
        WHERE first_message.conversation_id = vc.id
          AND first_message.sender_profile_id IS DISTINCT FROM auth.uid()
          AND first_message.deleted_at IS NULL
      )
    )
  ORDER BY coalesce(lm.created_at, vc.last_message_at, vc.created_at) DESC
$function$;

REVOKE ALL ON FUNCTION public.get_authorized_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_authorized_conversations() TO authenticated, service_role;

create or replace function public.send_conversation_message(conversation uuid, body text, acknowledged_contact_warning boolean default false)
 returns messages
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  recipient uuid;
  contains_contact boolean;
  saved_message public.messages%rowtype;
begin
  if char_length(coalesce(body, '')) > 4000 then
    raise exception 'Message is too long';
  end if;

  if coalesce(nullif(trim(body), ''), '') = '' then
    raise exception 'Message body is required';
  end if;

  if not public.is_conversation_member(conversation) then
    raise exception 'Only conversation members can send messages';
  end if;

  select cm.profile_id into recipient
  from public.conversation_members cm
  where cm.conversation_id = conversation and cm.profile_id <> auth.uid()
  limit 1;

  if recipient is null then
    raise exception 'Conversation recipient is missing';
  end if;

  if not public.can_conversation_accept_messages(conversation, auth.uid()) then
    raise exception 'Messages are not permitted in this conversation';
  end if;

  -- Only the employer can start a conversation. A worker may reply once the
  -- employer has sent something; until then the conversation is empty and
  -- the worker cannot be the one to open it.
  if exists (
    select 1 from public.conversations c
    where c.id = conversation and c.worker_profile_id = auth.uid()
  ) and not exists (
    select 1 from public.messages earlier
    where earlier.conversation_id = conversation
      and earlier.sender_profile_id is distinct from auth.uid()
      and earlier.deleted_at is null
  ) then
    raise exception 'Only the employer can start this conversation';
  end if;

  -- The unlock that paid for this conversation must still be running.
  if not exists (
    select 1
    from public.conversations c
    join public.profile_unlocks pu
      on pu.employer_id = c.employer_profile_id
     and pu.helper_id = c.worker_profile_id
     and pu.expires_at > now()
    where c.id = conversation
  ) then
    raise exception 'This conversation has expired because the profile unlock has ended';
  end if;

  contains_contact := public.contains_contact_detail(body);
  if contains_contact and not acknowledged_contact_warning then
    raise exception 'Off-platform communication warning must be acknowledged';
  end if;

  insert into public.messages (
    conversation_id, sender_profile_id, sender_id, receiver_id, body, content,
    original_body_hash, contact_warning_acknowledged, moderation_state, masked_at, delivered_at
  ) values (
    conversation, auth.uid(), auth.uid(), recipient,
    body,
    body,
    case when contains_contact then encode(sha256(body::bytea), 'hex') else null end,
    acknowledged_contact_warning,
    'clean'::public.message_moderation_state,
    null,
    now()
  )
  returning * into saved_message;

  update public.conversations set last_message_at = saved_message.created_at where id = conversation;
  update public.conversation_members set archived_at = null where conversation_id = conversation;

  perform public.notify_profile(
    recipient,
    'new_message',
    'New message',
    'You have a new message. Open Domestic Hub to reply.',
    'in_app',
    jsonb_build_object('conversationId', conversation, 'messageId', saved_message.id)
  );

  return saved_message;
end;
$function$;

revoke all on function public.send_conversation_message(uuid, text, boolean) from public, anon;
grant execute on function public.send_conversation_message(uuid, text, boolean) to authenticated;