create or replace function public.archive_conversation(p_conversation uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  changed integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in';
  end if;

  update public.conversation_members
  set archived_at = now()
  where conversation_id = p_conversation and profile_id = auth.uid();
  get diagnostics changed = row_count;

  if changed = 0 then
    raise exception 'This chat could not be found';
  end if;
end;
$function$;