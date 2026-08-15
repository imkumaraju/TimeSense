-- Allow the anon role to SELECT on tasks purely so the keep-alive workflow
-- (.github/workflows/keepalive-sys.yml) can ping the project without a secret key.
-- Row-level security (001_tasks.sql: "auth.uid() = user_id") still applies, so an
-- unauthenticated request returns zero rows — this does not expose any user data.

GRANT SELECT ON public.tasks TO anon;
