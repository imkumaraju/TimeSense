-- RLS policies alone don't grant access — Postgres checks table-level GRANTs first, then
-- filters rows via RLS. These grants were never applied when profiles/tasks/interruptions/
-- routines were created (001, 003, 007), so every signed-in client sync request has been
-- failing with "permission denied for table X" (SQLSTATE 42501) regardless of the RLS
-- policies being correct. 008_keepalive_grant.sql granting anon SELECT on tasks was the same
-- gap, just for a different role/table.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interruptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;
