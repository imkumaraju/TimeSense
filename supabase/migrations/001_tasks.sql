-- TimeSense tasks table + RLS (run in Supabase SQL Editor)
-- See BUILD_SPEC.md §4.2
-- Applied on live project (also includes description). Default visual: pizza.

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  category TEXT,
  predicted_seconds INTEGER NOT NULL,
  actual_seconds INTEGER,
  visual_style TEXT NOT NULL DEFAULT 'pizza',
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  mood_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_user_started_at_idx ON tasks (user_id, started_at DESC);
