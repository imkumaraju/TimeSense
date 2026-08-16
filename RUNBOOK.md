# Backup & Restore Runbook

The `sys` (production) Supabase project is on the free tier, which has no automatic
backups and no point-in-time recovery. `.github/workflows/supabase-backup.yml` runs a
nightly `pg_dump`, encrypts it with GPG, and uploads it to Cloudflare R2 as a second,
self-managed backup layer.

## One-time setup

1. **Create an R2 bucket** (Cloudflare dashboard → R2 → Create bucket). Free tier is
   10GB storage / no egress fees, which comfortably covers 30 days of daily dumps for
   this app's data size. Note the bucket name and the S3 API endpoint shown under
   "Manage R2 API Tokens" (looks like `https://<account-id>.r2.cloudflarestorage.com`).
2. **Create an R2 API token** scoped to that bucket (Object Read & Write). Save the
   Access Key ID and Secret Access Key.
3. **Generate a GPG passphrase** for encrypting backups — any long random string works,
   e.g. `openssl rand -base64 32`. Store it somewhere durable outside GitHub (password
   manager); losing it makes existing backups unrecoverable.
4. **Get the Supabase DB connection string** for the `sys` project: Supabase dashboard →
   Project Settings → Database → Connection string (URI, "Session" mode). Use the
   direct connection, not the pooler, for `pg_dump`.
5. **Add repo secrets** (GitHub repo → Settings → Secrets and variables → Actions):
   - `SUPABASE_DB_URL` — the connection string from step 4
   - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — from step 2
   - `R2_BUCKET` — bucket name from step 1
   - `R2_ENDPOINT` — S3 API endpoint from step 1
   - `BACKUP_ENCRYPTION_KEY` — passphrase from step 3
6. **Run the workflow manually once** (Actions tab → "Supabase backup (sys / production)"
   → Run workflow) and confirm an object lands in the R2 bucket.
7. **Test a restore** (see below) before considering this done. An untested backup is
   not a backup.

## Restoring from a backup

1. Download the `.sql.gpg` file from the R2 bucket (Cloudflare dashboard, or
   `aws s3 cp s3://$R2_BUCKET/<filename> . --endpoint-url $R2_ENDPOINT`).
2. Decrypt it:
   ```bash
   gpg --batch --passphrase "$BACKUP_ENCRYPTION_KEY" -d backup.sql.gpg > backup.sql
   ```
3. Restore into a target database (use a throwaway local Postgres to test, or the real
   project only in an actual incident):
   ```bash
   psql "$TARGET_DB_URL" -f backup.sql
   ```

## Notes

- This is a supplement to Supabase's own tooling, not a replacement — if the project
  ever moves to Pro ($25/mo), Supabase's built-in daily backups + PITR should become
  the primary recovery path and this workflow can be relaxed to a weekly cadence.
- The dev Supabase project does not need this — only `sys` holds real user data.
  `keepalive-dev.yml` / `keepalive-sys.yml` (separate workflows) exist purely to
  prevent free-tier project pausing from inactivity, not for backup purposes.
