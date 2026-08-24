grant usage on schema public to authenticated;
grant execute on function public.search_worker_previews(text, text, text, integer) to authenticated;
grant execute on function public.list_unlocked_worker_profiles() to authenticated;