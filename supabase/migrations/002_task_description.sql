-- Optional / legacy: add description if an older 001 was applied without it.
-- On the live TimeSense project this is already applied (and 001 now includes description).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
