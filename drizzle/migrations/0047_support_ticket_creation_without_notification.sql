create or replace function public.create_support_ticket(category text, subject text, message text)
returns public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  ticket public.support_tickets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if category not in ('payment', 'technical', 'account', 'safety', 'report_user', 'other') then
    raise exception 'invalid_category';
  end if;

  if coalesce(nullif(trim(subject), ''), '') = '' then
    raise exception 'subject_required';
  end if;

  if coalesce(nullif(trim(message), ''), '') = '' then
    raise exception 'message_required';
  end if;

  insert into public.support_tickets (requester_profile_id, ticket_number, category, subject, message, status)
  values (auth.uid(), public.next_support_ticket_number(), category, trim(subject), trim(message), 'new')
  returning * into ticket;

  return ticket;
end;
$function$;