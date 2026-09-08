CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_view_own_notifications" ON public.notifications;
CREATE POLICY "profiles_view_own_notifications" ON public.notifications
FOR SELECT USING (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_profile_read_created
  ON public.notifications(profile_id, read_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_profile(
  target_profile uuid,
  notification_type text,
  title text,
  body text DEFAULT '',
  channel text DEFAULT 'in_app',
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  new_id uuid;
begin
  INSERT INTO public.notifications (profile_id, notification_type, title, body, channel, metadata)
  VALUES (target_profile, notification_type, title, body, channel, metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.notify_profile(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_number text UNIQUE,
  category text NOT NULL CHECK (category IN ('payment', 'technical', 'account', 'safety', 'report_user', 'other')),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting_for_user', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requesters_view_own_tickets" ON public.support_tickets;
CREATE POLICY "requesters_view_own_tickets" ON public.support_tickets
FOR SELECT USING (requester_profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_updated
  ON public.support_tickets(requester_profile_id, updated_at DESC);

CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_support_ticket_number()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public'
AS $function$
  SELECT 'DH-SUP-' || lpad((nextval('support_ticket_number_seq'))::text, 6, '0')
$function$;

CREATE OR REPLACE FUNCTION public.create_support_ticket(category text, subject text, message text)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  ticket public.support_tickets%rowtype;
begin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF category NOT IN ('payment', 'technical', 'account', 'safety', 'report_user', 'other') THEN
    RAISE EXCEPTION 'invalid_category';
  END IF;

  IF coalesce(nullif(trim(subject), ''), '') = '' THEN
    RAISE EXCEPTION 'subject_required';
  END IF;

  IF coalesce(nullif(trim(message), ''), '') = '' THEN
    RAISE EXCEPTION 'message_required';
  END IF;

  INSERT INTO public.support_tickets (requester_profile_id, ticket_number, category, subject, message, status)
  VALUES (auth.uid(), public.next_support_ticket_number(), category, trim(subject), trim(message), 'new')
  RETURNING * INTO ticket;

  PERFORM public.notify_profile(
    auth.uid(),
    'support_ticket_update',
    'Support ticket received',
    'We received your ticket ' || ticket.ticket_number || ' and will respond soon.',
    'in_app',
    jsonb_build_object('ticketId', ticket.id, 'ticketNumber', ticket.ticket_number)
  );

  RETURN ticket;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_support_ticket(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text) TO authenticated;