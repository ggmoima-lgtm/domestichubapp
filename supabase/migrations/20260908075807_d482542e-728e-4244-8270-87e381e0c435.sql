create or replace function public.update_notification_preferences(
  messages boolean default true,
  interviews boolean default true,
  profile_unlocks boolean default true,
  hire_updates boolean default true,
  reviews boolean default true,
  credits boolean default true,
  admin_actions boolean default true
)
returns public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  requester uuid := auth.uid();
  preferences public.notification_preferences%rowtype;
begin
  if requester is null then
    raise exception 'Please sign in to update notification preferences';
  end if;

  insert into public.notification_preferences (
    user_id, messages, interviews, profile_unlocks, hire_updates, reviews, credits, admin_actions
  )
  values (
    requester, messages, interviews, profile_unlocks, hire_updates, reviews, credits, admin_actions
  )
  on conflict (user_id) do update set
    messages = excluded.messages,
    interviews = excluded.interviews,
    profile_unlocks = excluded.profile_unlocks,
    hire_updates = excluded.hire_updates,
    reviews = excluded.reviews,
    credits = excluded.credits,
    admin_actions = excluded.admin_actions,
    updated_at = now()
  returning * into preferences;

  return preferences;
end;
$function$;

revoke all on function public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public;
revoke all on function public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean) from anon;
grant execute on function public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  reauthenticated_at timestamp with time zone,
  requested_at timestamp with time zone not null default now(),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled'))
);

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

create index if not exists idx_account_deletion_requests_profile on public.account_deletion_requests(profile_id);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "profiles_view_own_deletion_requests" on public.account_deletion_requests;

create policy "profiles_view_own_deletion_requests" on public.account_deletion_requests
for select using (profile_id = auth.uid());

create or replace function public.request_account_deletion(reason text default null, reauthenticated_at timestamp with time zone default null)
returns public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  requester uuid := auth.uid();
  request_row public.account_deletion_requests%rowtype;
begin
  if requester is null then
    raise exception 'Please sign in to request account deletion';
  end if;

  insert into public.account_deletion_requests (profile_id, reason, reauthenticated_at)
  values (requester, nullif(trim(coalesce(reason, '')), ''), reauthenticated_at)
  returning * into request_row;

  update public.profiles
  set status = 'deleted', deleted_at = now()
  where id = requester;

  return request_row;
end;
$function$;

revoke all on function public.request_account_deletion(text, timestamp with time zone) from public;
revoke all on function public.request_account_deletion(text, timestamp with time zone) from anon;
grant execute on function public.request_account_deletion(text, timestamp with time zone) to authenticated;