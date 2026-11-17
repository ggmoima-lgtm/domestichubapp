create trigger support_tickets_received
after update of status on public.support_tickets
for each row
when (old.status::text = 'new' and new.status::text <> 'new')
execute function public.notify_support_ticket_received();