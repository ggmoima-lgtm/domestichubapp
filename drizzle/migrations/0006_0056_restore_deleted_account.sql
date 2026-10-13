create or replace function public.restore_deleted_account()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile_id uuid;
  v_cancelled bigint;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to restore your account';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where (p.user_id = auth.uid() or p.id = auth.uid())
    and p.status = 'deleted'
  limit 1;
  if v_profile_id is null then
    raise exception 'This account is not scheduled for deletion';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled'
  where profile_id = v_profile_id and status = 'pending';
  get diagnostics v_cancelled = row_count;
  if v_cancelled = 0 then
    raise exception 'The deletion has already been completed or cancelled';
  end if;

  update public.profiles
  set status = 'active', deleted_at = null
  where id = v_profile_id;

  return jsonb_build_object('restored', true, 'profile_id', v_profile_id);
end;
$function$;

revoke all on function public.restore_deleted_account() from public, anon;
grant execute on function public.restore_deleted_account() to authenticated;