-- Soft-delete routines instead of hard DELETE, mirroring the profiles pattern
-- from 006_soft_delete_account.sql. Deleted rows are filtered client-side
-- (deleted_at IS NULL) rather than removed, so delta sync (updated_at
-- watermark) can still propagate the deletion to other devices.

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
