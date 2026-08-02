-- Profile name fields for email signup + OAuth (Google/Apple).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Seed profile names from auth.users metadata on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(trim(COALESCE(meta->>'first_name', meta->>'given_name', '')), '');
  v_last text := NULLIF(trim(COALESCE(meta->>'last_name', meta->>'family_name', '')), '');
  v_user text := NULLIF(trim(COALESCE(meta->>'username', '')), '');
  v_display text := NULLIF(trim(COALESCE(
    meta->>'full_name',
    meta->>'name',
    meta->>'display_name',
    trim(COALESCE(v_first, '') || ' ' || COALESCE(v_last, ''))
  )), '');
BEGIN
  IF v_display IS NULL OR v_display = '' THEN
    v_display := NULLIF(trim(COALESCE(v_first, '') || ' ' || COALESCE(v_last, '')), '');
  END IF;

  INSERT INTO public.profiles (id, display_name, username, first_name, last_name)
  VALUES (NEW.id, v_display, v_user, v_first, v_last)
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    username = COALESCE(EXCLUDED.username, profiles.username),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
