-- Recurring routines + tasks.routine_id.
-- Apply on each Supabase env after 006.
-- routine_notifications stay device-local (not created here).

CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  category TEXT,
  predicted_seconds INTEGER NOT NULL,
  visual_style TEXT NOT NULL DEFAULT 'pizza',
  recurrence_days TEXT NOT NULL,
  reminder_hour INTEGER NOT NULL DEFAULT 9,
  reminder_minute INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routines_user_updated
  ON public.routines (user_id, updated_at);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own routines" ON public.routines;
CREATE POLICY "Users manage their own routines"
  ON public.routines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_routine_id ON public.tasks (routine_id);

-- Fresh start also wipes routines for returning inactive users.
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
  DELETE FROM public.routines WHERE user_id = uid;

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
