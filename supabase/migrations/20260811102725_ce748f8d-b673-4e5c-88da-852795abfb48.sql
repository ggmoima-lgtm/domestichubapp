-- ===== Base messaging schema =====
DO $$ BEGIN
  CREATE TYPE public.message_moderation_state AS ENUM ('clean','masked','flagged','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.job_posts(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  muted_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_profile_id uuid,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS original_body_hash text,
  ADD COLUMN IF NOT EXISTS contact_warning_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_state public.message_moderation_state NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS masked_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.is_conversation_member(conversation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation AND cm.profile_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users bu
    WHERE (bu.blocker_id = a AND bu.blocked_id = b)
       OR (bu.blocker_id = b AND bu.blocked_id = a)
  )
$$;

CREATE OR REPLACE FUNCTION public.contains_contact_detail(body text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(body, '') ~* '(\+?\d[\d\s\-\(\)]{7,}\d)|([[:alnum:]._%%+-]+@[[:alnum:].-]+\.[a-z]{2,})|(wa\.me|whatsapp|telegram|instagram|facebook|\bIG\b|\bsnap\b)'
$$;

CREATE OR REPLACE FUNCTION public.mask_contact_details(body text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(
           regexp_replace(coalesce(body,''), '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[a-z]{2,}', '[hidden]', 'gi'),
           '\+?\d[\d\s\-\(\)]{7,}\d', '[hidden]', 'g')
$$;

-- Conversation RLS
DROP POLICY IF EXISTS "members_view_conversations" ON public.conversations;
CREATE POLICY "members_view_conversations" ON public.conversations
FOR SELECT TO authenticated USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "members_view_conversation_members" ON public.conversation_members;
CREATE POLICY "members_view_conversation_members" ON public.conversation_members
FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "members_update_own_membership" ON public.conversation_members;
CREATE POLICY "members_update_own_membership" ON public.conversation_members
FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- ===== 0014_unlock_authorized_messaging =====
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS employer_profile_id uuid REFERENCES public.employer_profiles(profile_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS worker_profile_id uuid REFERENCES public.worker_profiles(profile_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_from_unlock_id uuid REFERENCES public.profile_unlocks(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS role public.app_role,
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_employer_worker_unique
ON public.conversations(employer_profile_id, worker_profile_id)
WHERE employer_profile_id IS NOT NULL AND worker_profile_id IS NOT NULL AND status <> 'deleted';

CREATE INDEX IF NOT EXISTS idx_conversations_member_sort ON public.conversations(last_message_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_profile ON public.conversation_members(profile_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread_lookup ON public.messages(conversation_id, sender_profile_id, read_at);

DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;
CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_profile_active(profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile
      AND coalesce(p.status, 'active') = 'active'
      AND coalesce(p.is_blocked, false) = false
  )
$$;

CREATE OR REPLACE FUNCTION public.can_conversation_accept_messages(conversation uuid, sender uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.conversation_members sender_member
      ON sender_member.conversation_id = c.id AND sender_member.profile_id = sender
    JOIN public.conversation_members recipient_member
      ON recipient_member.conversation_id = c.id AND recipient_member.profile_id <> sender
    WHERE c.id = conversation
      AND c.status = 'active'
      AND public.is_profile_active(sender)
      AND public.is_profile_active(recipient_member.profile_id)
      AND NOT public.is_blocked_between(sender, recipient_member.profile_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.start_unlocked_conversation(
  worker uuid,
  related_job uuid DEFAULT NULL,
  related_application uuid DEFAULT NULL
) RETURNS public.conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  active_unlock public.profile_unlocks%rowtype;
  conversation public.conversations%rowtype;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || worker::text || ':conversation', 0));

  IF worker = auth.uid() THEN
    RAISE EXCEPTION 'Employers cannot message their own worker profile';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.employer_profiles ep WHERE ep.profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only employers can start a worker conversation';
  END IF;

  IF NOT public.is_profile_active(auth.uid()) OR NOT public.is_profile_active(worker) THEN
    RAISE EXCEPTION 'Conversation is not available for inactive accounts';
  END IF;

  IF public.is_blocked_between(auth.uid(), worker) THEN
    RAISE EXCEPTION 'Conversation is not permitted between blocked users';
  END IF;

  SELECT * INTO active_unlock
  FROM public.profile_unlocks pu
  WHERE pu.employer_id = auth.uid()
    AND pu.helper_id = worker
    AND pu.expires_at > now()
  ORDER BY pu.expires_at DESC
  LIMIT 1;

  IF active_unlock.id IS NULL THEN
    RAISE EXCEPTION 'Unlock this profile to message this worker';
  END IF;

  SELECT * INTO conversation
  FROM public.conversations c
  WHERE c.employer_profile_id = auth.uid()
    AND c.worker_profile_id = worker
    AND c.status <> 'deleted'
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF conversation.id IS NULL THEN
    INSERT INTO public.conversations (
      job_id, related_application_id, employer_profile_id, worker_profile_id,
      created_from_unlock_id, last_message_at, status
    ) VALUES (
      related_job, related_application, auth.uid(), worker, active_unlock.id, now(), 'active'
    )
    RETURNING * INTO conversation;
  ELSE
    UPDATE public.conversations
    SET status = 'active', archived_at = NULL
    WHERE id = conversation.id
    RETURNING * INTO conversation;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, profile_id, role, last_read_at)
  VALUES
    (conversation.id, auth.uid(), 'employer', now()),
    (conversation.id, worker, 'worker', NULL)
  ON CONFLICT (conversation_id, profile_id)
  DO UPDATE SET archived_at = NULL, role = excluded.role;

  RETURN conversation;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_profile uuid, job uuid DEFAULT NULL)
RETURNS public.conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.employer_profiles ep WHERE ep.profile_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.profile_id = other_profile) THEN
    RETURN public.start_unlocked_conversation(other_profile, job, NULL);
  END IF;
  RAISE EXCEPTION 'Unlock this profile to message this worker';
END;
$$;

CREATE OR REPLACE FUNCTION public.send_conversation_message(conversation uuid, body text, acknowledged_contact_warning boolean DEFAULT false)
RETURNS public.messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipient uuid;
  contains_contact boolean;
  saved_message public.messages%rowtype;
BEGIN
  IF char_length(coalesce(body, '')) > 4000 THEN
    RAISE EXCEPTION 'Message is too long';
  END IF;

  IF coalesce(nullif(trim(body), ''), '') = '' THEN
    RAISE EXCEPTION 'Message body is required';
  END IF;

  IF NOT public.is_conversation_member(conversation) THEN
    RAISE EXCEPTION 'Only conversation members can send messages';
  END IF;

  SELECT cm.profile_id INTO recipient
  FROM public.conversation_members cm
  WHERE cm.conversation_id = conversation AND cm.profile_id <> auth.uid()
  LIMIT 1;

  IF recipient IS NULL THEN
    RAISE EXCEPTION 'Conversation recipient is missing';
  END IF;

  IF NOT public.can_conversation_accept_messages(conversation, auth.uid()) THEN
    RAISE EXCEPTION 'Messages are not permitted in this conversation';
  END IF;

  contains_contact := public.contains_contact_detail(body);
  IF contains_contact AND NOT acknowledged_contact_warning THEN
    RAISE EXCEPTION 'Off-platform communication warning must be acknowledged';
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_profile_id, sender_id, receiver_id, body, content,
    original_body_hash, contact_warning_acknowledged, moderation_state, masked_at, delivered_at
  ) VALUES (
    conversation, auth.uid(), auth.uid(), recipient,
    CASE WHEN contains_contact THEN public.mask_contact_details(body) ELSE body END,
    CASE WHEN contains_contact THEN public.mask_contact_details(body) ELSE body END,
    CASE WHEN contains_contact THEN encode(sha256(body::bytea), 'hex') ELSE NULL END,
    acknowledged_contact_warning,
    CASE WHEN contains_contact THEN 'masked'::public.message_moderation_state ELSE 'clean'::public.message_moderation_state END,
    CASE WHEN contains_contact THEN now() ELSE NULL END,
    now()
  )
  RETURNING * INTO saved_message;

  UPDATE public.conversations SET last_message_at = saved_message.created_at WHERE id = conversation;
  UPDATE public.conversation_members SET archived_at = NULL WHERE conversation_id = conversation;

  RETURN saved_message;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(conversation uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_conversation_member(conversation) THEN
    RAISE EXCEPTION 'Only conversation members can mark messages read';
  END IF;

  UPDATE public.messages
  SET read_at = coalesce(read_at, now())
  WHERE conversation_id = conversation AND sender_profile_id <> auth.uid();

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = conversation AND profile_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_authorized_conversations()
RETURNS TABLE (
  id uuid, other_profile_id uuid, other_name text, other_role text, context text,
  status text, last_message_preview text, last_message_at timestamptz,
  unread_count integer, muted boolean, archived boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    coalesce(j.title || CASE WHEN j.location IS NULL THEN '' ELSE ' - ' || j.location END, 'Profile connection'),
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
  LEFT JOIN public.job_posts j ON j.id = vc.job_id
  WHERE public.is_profile_active(auth.uid())
    AND public.is_profile_active(om.profile_id)
    AND NOT public.is_blocked_between(auth.uid(), om.profile_id)
  ORDER BY coalesce(lm.created_at, vc.last_message_at, vc.created_at) DESC
$$;

DROP POLICY IF EXISTS "members_view_messages" ON public.messages;
CREATE POLICY "members_view_messages" ON public.messages
FOR SELECT TO authenticated USING (
  conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id)
);

DROP POLICY IF EXISTS "members_send_messages" ON public.messages;
CREATE POLICY "members_send_messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_profile_id = auth.uid()
  AND public.can_conversation_accept_messages(conversation_id, auth.uid())
);

REVOKE EXECUTE ON FUNCTION public.start_unlocked_conversation(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_authorized_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_conversation_accept_messages(uuid, uuid) FROM anon;