-- Subscription entitlement fields on profiles (TimeSense Plus monetization)
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
