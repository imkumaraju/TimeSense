-- TimeSense cost-strategy schema (BUILD_SPEC.md §4.2–4.3)
-- Run after 001_tasks.sql (and 002 if already applied).
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS where possible.

-- Profiles (auto-created on signup via trigger below)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT,
  default_visual_style TEXT DEFAULT 'pizza',
  streak_count INTEGER DEFAULT 0,
  freezes_available INTEGER DEFAULT 2,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks: delta-sync watermark + product defaults (safe if 001/002 already applied)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ALTER COLUMN visual_style SET DEFAULT 'pizza';
ALTER TABLE profiles ALTER COLUMN default_visual_style SET DEFAULT 'pizza';

CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON tasks(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category);

-- Interruptions (v1.5 schema ready; used by sync + future interruption UI)
CREATE TABLE IF NOT EXISTS interruptions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interruptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own profile" ON profiles;
CREATE POLICY "Users manage their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prefer the cost-strategy policy name; keep old tasks policy if already present
DROP POLICY IF EXISTS "Users manage their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only access their own tasks" ON tasks;
CREATE POLICY "Users manage their own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own interruptions" ON interruptions;
CREATE POLICY "Users manage their own interruptions"
  ON interruptions FOR ALL
  USING (auth.uid() = (SELECT user_id FROM tasks WHERE tasks.id = task_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM tasks WHERE tasks.id = task_id));

-- Auto-create profile on signup (no extra client round-trip)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users who signed up before the trigger existed
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
