-- Track each profile's email (previously only in auth.users, unreadable from the
-- client without service-role access) and enforce username uniqueness, which had
-- no constraint at all — two users could pick the identical username silently.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Case-insensitive uniqueness; NULLs (guest/local-only rows never synced) are
-- allowed to repeat since a partial unique index skips them.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- Populate email for every signup (email/password, magic link, or OAuth all set
-- auth.users.email) and keep it current if it's ever changed/reconfirmed.
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

  INSERT INTO public.profiles (id, email, display_name, username, first_name, last_name)
  VALUES (NEW.id, NEW.email, v_display, v_user, v_first, v_last)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    username = COALESCE(EXCLUDED.username, profiles.username),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep profiles.email current if auth.users.email changes (email change flow,
-- re-verification, etc.) — the insert trigger alone only covers signup.
CREATE OR REPLACE FUNCTION public.handle_user_email_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_updated();

-- Backfill email for accounts that signed up before this migration.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
