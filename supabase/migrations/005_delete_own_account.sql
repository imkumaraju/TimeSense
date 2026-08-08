-- Legacy hard-delete (auth.users). Superseded by 006_soft_delete_account.sql,
-- which replaces this function with a soft-delete forwarder and adds
-- soft_delete_own_account + fresh_start_own_account.
-- New environments: still safe to run 005 then 006 in order.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
