create or replace function public.notify_support_ticket_received()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.notify_profile(
    new.requester_profile_id,
    'support_ticket_update',
    'Support ticket received',
    'Domestic Hub support has received your ticket ' || new.ticket_number || ' and will respond soon.',
    'in_app',
    jsonb_build_object('ticketId', new.id, 'ticketNumber', new.ticket_number)
  );
  return new;
exception when others then
  return new;
end;
$function$;