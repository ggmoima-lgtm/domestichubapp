revoke execute on function public.search_worker_previews(text, text, text, integer) from anon, public;
revoke execute on function public.list_unlocked_worker_profiles() from anon, public;
grant execute on function public.search_worker_previews(text, text, text, integer) to authenticated;
grant execute on function public.list_unlocked_worker_profiles() to authenticated;