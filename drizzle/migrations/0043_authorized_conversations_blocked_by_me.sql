drop function if exists public.get_authorized_conversations();

create function public.get_authorized_conversations()
 returns table(id uuid, other_profile_id uuid, other_name text, other_role text, context text, status text, last_message_preview text, last_message_at timestamp with time zone, unread_count integer, muted boolean, archived boolean, blocked_by_me boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
    vc.member_archived_at IS NOT NULL,
    EXISTS (
      SELECT 1 FROM public.blocked_users mine
      WHERE mine.blocker_id = auth.uid() AND mine.blocked_id = om.profile_id
    )
  FROM visible_conversations vc
  JOIN other_members om ON om.conversation_id = vc.id
  JOIN public.profiles p ON p.id = om.profile_id
  LEFT JOIN last_messages lm ON lm.conversation_id = vc.id
  LEFT JOIN public.jobs j ON j.id = vc.job_id
  WHERE public.is_profile_active(auth.uid())
    AND public.is_profile_active(om.profile_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users theirs
      WHERE theirs.blocker_id = om.profile_id AND theirs.blocked_id = auth.uid()
    )
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

revoke all on function public.get_authorized_conversations() from public, anon;
grant execute on function public.get_authorized_conversations() to authenticated;