create or replace function public.block_profile(blocked uuid, reason text default null)
returns public.blocked_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  blocker uuid := auth.uid();
  block_row public.blocked_users%rowtype;
begin
  if blocker is null then
    raise exception 'Please sign in to block a profile';
  end if;
  if blocked is null then
    raise exception 'A profile to block is required';
  end if;
  if blocked = blocker then
    raise exception 'You cannot block yourself';
  end if;

  select * into block_row
  from public.blocked_users
  where blocker_id = blocker and blocked_id = blocked;

  if block_row.id is not null then
    return block_row;
  end if;

  insert into public.blocked_users (blocker_id, blocked_id)
  values (blocker, blocked)
  returning * into block_row;

  return block_row;
end;
$function$;

revoke all on function public.block_profile(uuid, text) from public;
grant execute on function public.block_profile(uuid, text) to authenticated;

create or replace function public.report_content(target_type text, target_id uuid, reason text, details text default null)
returns public.user_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  reporter uuid := auth.uid();
  reported uuid;
  report_row public.user_reports%rowtype;
begin
  if reporter is null then
    raise exception 'Please sign in to submit a report';
  end if;
  if coalesce(nullif(trim(reason), ''), '') = '' then
    raise exception 'A reason is required';
  end if;
  if target_type = 'user' then
    reported := target_id;
  elsif target_type = 'message' then
    select sender_profile_id into reported from public.messages where id = target_id;
    if reported is null then
      raise exception 'This message could not be found';
    end if;
  else
    raise exception 'Reporting this type of content is not supported yet';
  end if;
  if reported = reporter then
    raise exception 'You cannot report yourself';
  end if;
  insert into public.user_reports (reporter_id, reported_user_id, reason, details, status)
  values (reporter, reported, reason, nullif(trim(coalesce(details, '')), ''), 'open')
  returning * into report_row;
  return report_row;
end;
$function$;

revoke all on function public.report_content(text, uuid, text, text) from public;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;