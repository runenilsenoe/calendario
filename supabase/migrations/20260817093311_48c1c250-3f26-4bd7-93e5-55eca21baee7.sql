REVOKE EXECUTE ON FUNCTION public.event_owner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_event_access(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_event(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_event_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.event_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_event_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_event(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_public(uuid) TO anon, authenticated;