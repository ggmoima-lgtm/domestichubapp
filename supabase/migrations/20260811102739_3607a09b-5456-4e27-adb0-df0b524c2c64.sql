REVOKE EXECUTE ON FUNCTION public.send_conversation_message(uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_direct_conversation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_profile_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) FROM anon;