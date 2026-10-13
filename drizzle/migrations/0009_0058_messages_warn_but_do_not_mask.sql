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