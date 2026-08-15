-- Soft-delete accounts: keep auth.users + historical rows while inactive.
-- On return (app calls fresh_start_own_account): purge that user's tasks and reactivate profile.
-- Replaces hard-delete behavior from 005_delete_own_account.sql.
-- Apply on each Supabase env after 004 (and 005 if already applied).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Mark the signed-in user's profile inactive. Does NOT delete auth.users or tasks.
CREATE OR REPLACE FUNCTION public.soft_delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, deleted_at)
  VALUES (uid, now())
  ON CONFLICT (id) DO UPDATE
  SET deleted_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_own_account() TO authenticated;

-- After an inactive user signs in again: wipe their cloud timers and clear deleted_at.
CREATE OR REPLACE FUNCTION public.fresh_start_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.interruptions
  WHERE task_id IN (SELECT id FROM public.tasks WHERE user_id = uid);

  DELETE FROM public.tasks WHERE user_id = uid;

  INSERT INTO public.profiles (id)
  VALUES (uid)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
  SET
    deleted_at = NULL,
    streak_count = 0,
    freezes_available = 2,
    last_active_date = NULL
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.fresh_start_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fresh_start_own_account() TO authenticated;

-- Back-compat: old clients calling delete_own_account now soft-delete instead of wiping auth.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.soft_delete_own_account();
END;
$$;
