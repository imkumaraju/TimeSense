# TimeSense — Deployment Action Checklist

Follows `deployment-strategy-spec.md`, collapsed to **two live environments** (**dev** / **sys**), each with its own Supabase project, EAS build profile, and app identifier. `sys` **is production** for real users — the original 3rd tier (`main` / `com.timesense` / a separate `timesense-prod` Supabase project) is **dormant**: kept in config/docs for a possible future split, not built or deployed today. This avoids the Supabase free-tier 2-project cap entirely.

Use this as the ordered to-do list. Checkboxes are for you (accounts, portals, secrets). Repo follow-ups are listed under each phase.

---

## Already in place

| Area | Status |
|------|--------|
| Expo app (SDK 54), Expo Router, TypeScript | Done |
| App name / slug `TimeSense` / `timesense` | Done (`app.config.js`) |
| Bundle / package IDs (env-specific) | **Done** — `com.timesense.dev` (dev) / `com.timesense.sys` (**production**) via `APP_ENV` |
| URL schemes (env-specific) + path `/auth/callback` | **Done** — `timesense-dev` / `timesense-sys` (`app.config.js`, `lib/oauth.ts`) |
| `eas.json` profiles: `development`, `preview`, `release`, `production` (dormant) | **Done** — `APP_ENV` per profile. `preview` = internal APK for ad-hoc device testing (sys identity/Supabase). `release` = app-bundle, same sys identity, for Play Store uploads. `production` (APP_ENV=production, `com.timesense`) stays dormant. |
| Migrations in [`supabase/migrations/`](../supabase/migrations/) | Done — apply per env via `npm run db:migrate:*` (see [Database migrations](#database-migrations)) |
| Local `.env` + `.env.example` (`EXPO_PUBLIC_SUPABASE_URL` + `KEY`/`ANON_KEY`) | Done |
| Social auth setup docs (`supabase/SETUP.txt`, `SOCIAL_AUTH_SETUP.txt`) | Done — update per env |
| GitHub remote `imkumaraju/TimeSense` | Done |
| Promotion guide (`docs/GITHUB_PROMOTION.md`) | Done — now `dev` → `sys` only |
| `dev` / `sys` branches on remote | Done. `main` exists but is dormant (not part of the live pipeline). |
| Lightweight PR CI (Jest on PRs to `dev`/`sys`/`main`) | In repo (`.github/workflows/ci.yml`) |
| EAS account login / linked Expo project `@raju003/timesense` | **Done** — confirmed via `eas whoami` (`raju003`), projectId `c1c68318-e26c-477f-8074-b4cba4e48901` |
| `app.config.js` (env-based name + bundle id + scheme) | **Done** |
| EAS env vars (Supabase URL + anon key per environment) | **Unverified** — check with `eas env:list --environment development` / `--environment preview`; create with `eas env:create` if missing (see Phase 3) |
| Supabase projects | Dev + sys (=production) live. No 3rd project — not needed under this plan. |
| Supabase redirect allow lists for new schemes | **You** — add `timesense-dev://…` / `timesense-sys://…` (see below) |
| GitHub Actions keep-alive | **Done** — `.github/workflows/keepalive-dev.yml` + `keepalive-sys.yml` exist; confirm repo secrets are set (Phase 6) |
| Play Store listing | **Missing** — this doc's Phase 5 |
| README | **Done** |
| `authenticated` role table grants (profiles/tasks/interruptions/routines) | **Done** — migration 011 applied to both dev and sys (2026-08-22) |

---

## Confirmed decision: bundle / package IDs

| Environment | Git branch | EAS profile | App ID (Android) | Display name | Supabase project | Project ref |
|-------------|------------|-------------|-------------------|---------------|------------------|-------------|
| **Dev** | `dev` | `development` | `com.timesense.dev` | TimeSense Dev | timesense (dev) | `pwgspnqodaokmkoyghcu` |
| **Sys = Production** | `sys` | `preview` | `com.timesense.sys` | TimeSense | timesense-sys | `uihapuiivlrpfxftyivo` |
| *(dormant)* future 3rd tier | `main` | `production` | `com.timesense` | — | not created | TBD |

**Git promote flow (PRs only):** see **[GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md)** — `feature/*` → `dev` → `sys`, including how migrations travel with the same PRs. `main` is not part of this flow.

**IDs are wired in `app.config.js`.** Old placeholder `com.timesense.app` is retired — do **not** create Apple/Google/store apps under it. `com.timesense.sys` is the real Play Store package for this release — do not rename it to `com.timesense` later without a deliberate migration (Play Store treats package name changes as a new app).

**Deep link schemes (live in `app.config.js` + `lib/oauth.ts`):**

| `APP_ENV` / EAS profile | Bundle / package | Scheme | OAuth redirect |
|-------------------------|------------------|--------|----------------|
| `development` | `com.timesense.dev` | `timesense-dev` | `timesense-dev://auth/callback` |
| `preview` (**production**) | `com.timesense.sys` | `timesense-sys` | `timesense-sys://auth/callback` |

OAuth path is always `/auth/callback` (`lib/oauth.ts`, `app/auth/callback.tsx`). Expo Go still uses `exp://…/--/auth/callback` (custom schemes are not owned by Expo Go).

**You must update the Supabase redirect allow list** (dev + sys projects) to include the env schemes — see [Auth → URL Configuration](#2-auth--url-configuration). Without that, standalone / dev-client Google sign-in will fail.

---

## OAuth console checklist (you — do before building for real users)

How auth works today (`lib/oauth.ts`):

1. App calls Supabase `signInWithOAuth` with `redirectTo` = app deep link (`timesense-sys://auth/callback` or `exp://…`).
2. Browser hits **Google** → Google redirects to **Supabase** `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase redirects to the app deep link with tokens.

So Google Console must authorize the **Supabase** callback URL (not the app scheme). Supabase must allow-list the **app** deep link.

### Recommendation: Google Cloud

**One Google Cloud project**, two **Web application** OAuth clients (dev / sys).

- Supabase Google provider uses the **Web** client ID + secret (browser OAuth).
- **Android OAuth client is optional** for the current Expo + Supabase browser flow. Add it later for native Google Sign-In / Play integrity — not required for Expo Go or `signInWithOAuth`.

### Google Cloud Console — exact steps

For **each** env (dev, sys):

1. [ ] [console.cloud.google.com](https://console.cloud.google.com/) → same project → APIs & Services → Credentials
2. [ ] Create **OAuth client ID** → Application type: **Web application**
   - Name: e.g. `TimeSense Supabase Dev` / `… Sys (Production)`
3. [ ] **Authorized redirect URIs** — add **only** that env's Supabase callback:

   | Env | Authorized redirect URI |
   |-----|-------------------------|
   | Dev (existing) | `https://pwgspnqodaokmkoyghcu.supabase.co/auth/v1/callback` |
   | Sys (production) | `https://uihapuiivlrpfxftyivo.supabase.co/auth/v1/callback` |

4. [ ] Copy **Client ID** + **Client Secret** → paste into that env's Supabase → Authentication → Providers → Google
5. [ ] OAuth consent screen: publish to **In production** before real users hit sys (not "Testing", which caps at 100 test users and shows an unverified warning)
6. [ ] **Authorized JavaScript origins** — usually leave empty for this mobile/Supabase flow (redirect URI is enough)

**Optional later (native Android):** create an **Android** OAuth client per package:

| Package | SHA-1 |
|---------|-------|
| `com.timesense.dev` | debug keystore and/or EAS credentials SHA-1 |
| `com.timesense.sys` | EAS preview keystore SHA-1 / Play App Signing SHA-1 once uploaded to Play Console |

```bash
# Debug SHA-1 (Windows)
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Do **not** put Android client secrets into Supabase — keep using the **Web** client there.

### Supabase — exact steps (per project: timesense-dev / sys)

Do this on **each** project after it exists. Existing project `pwgspnqodaokmkoyghcu` = dev.

#### 1. Schema (every project)

- [ ] Apply every file in [`supabase/migrations/`](../supabase/migrations/) in numeric order (`001`
      through the current head — see the directory for the full, up-to-date list). **Never
      hand-edit schema in the dashboard** — every change is a committed migration file, full stop.
- [ ] Preferred: `npm run db:migrate:dev` / `npm run db:migrate:prod` (wraps `supabase db push`,
      requires `SUPABASE_DEV_DB_URL` / `SUPABASE_SYS_DB_URL` set locally — see
      [Database migrations](#database-migrations) below). Falls back to pasting the same files
      into SQL Editor, in order, if you don't have a DB connection string handy.
- [ ] Later changes: `supabase migration new …` → commit → apply via the script above (or SQL
      Editor) on the env matching the branch

#### 2. Auth → URL Configuration

| Field | Dev (`pwgspnqodaokmkoyghcu`) | Sys / Production (`uihapuiivlrpfxftyivo`) |
|-------|------------------------------|--------------------------------------------|
| **Site URL** | `timesense-dev://auth/callback` | `timesense-sys://auth/callback` |
| **Redirect allow list** | dev scheme + Expo Go entries | sys scheme + Expo Go entries |

**Redirect URLs — add on each project (own scheme + shared Expo Go):**

```
# Dev project
timesense-dev://auth/callback
timesense-dev://**
exp://**
exp://127.0.0.1:8081/--/*
http://localhost:8081/**

# Sys project (production)
timesense-sys://auth/callback
timesense-sys://**
exp://**
exp://127.0.0.1:8081/--/*
http://localhost:8081/**
```

If sign-in returns to the browser but not the app: Auth screen in `__DEV__` shows the live redirect URI — paste that **exact** string into Additional Redirect URLs.

#### 3. Auth → Providers → Google

- [ ] Enable Google
- [ ] Client ID + Client Secret = the **Web** OAuth client for **this** env only
- [ ] Save

#### 4. Auth → Providers → Apple (same setup file; brief)

**Native iOS** (`expo-apple-authentication` / id token) — enable Apple; **Client IDs** (comma-separated):

```
host.exp.Exponent,com.timesense.dev,com.timesense.sys
```

(Remove old `com.timesense.app` once you stop using that ID. Not currently shipping to iOS/TestFlight — this keeps the option open without extra cost.)

- Expo Go testing: Secret Key can stay empty if you only use native Sign in with Apple on iOS.

#### 5. Differences between the two projects

| | Dev | Sys (Production) |
|---|-----|-------------------|
| Data | Disposable | **Real users** |
| Google Web client | Dev client | Sys client (consent screen published) |
| Site URL / redirects | Dev scheme | Sys scheme |
| Keep-alive ping | Optional | **Required** (real users depend on uptime) |

Copy **Project URL** + **anon key** into `.env.*` / EAS env for that profile only.

---

## Order of operations (OAuth-safe)

1. [ ] Confirm sys Supabase has every file in `supabase/migrations/` applied (`npm run db:migrate:prod` or check via dashboard).
2. [ ] Google Cloud: create two **Web** OAuth clients (dev, sys); add each project's `…/auth/v1/callback` redirect URI.
3. [ ] Supabase per project: URL Configuration (Site URL + redirects) → Google provider (that env's Web client) → Apple Client IDs.
4. [ ] Publish the Google OAuth consent screen to production before real users sign in on sys.
5. [x] Repo: `app.config.js` + `eas.json` + env schemes (done).
6. [ ] Add env-specific deep links to Supabase redirect lists; set EAS env vars.

**Do not** change Google redirect URIs away from Supabase callbacks. **Do not** point the `preview`/production build at the **dev** Supabase project.

---

## Phase 0 — Accounts & subscriptions (you)

- [ ] **Expo account** — [expo.dev](https://expo.dev) → sign up / confirm you can log in
  ```bash
  npx eas-cli login
  npx eas-cli init          # link this repo; writes projectId into app config
  ```
- [ ] **Google Play Console** ($25 one-time) — [play.google.com/console](https://play.google.com/console)
- [ ] **Google Cloud** OAuth — follow [OAuth console checklist](#oauth-console-checklist-you--do-before-building-for-real-users) above.
- [ ] **GitHub** — confirm you own `imkumaraju/TimeSense` and can add Actions secrets.

*(Apple Developer Program is not needed for this release — iOS/TestFlight is out of scope.)*

---

## Phase 1 — Git promotion branches

**Full guide:** [GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md) (`feature/*` → `dev` → `sys`, migration apply steps, branch protection).

- [ ] Confirm `dev` / `sys` on remote (do **not** force-push; leave local WIP uncommitted if needed)
- [ ] Branch protection on `sys`: require PR, no force push
- [ ] Day-to-day: branch from `dev`, PR into `dev` first; promote with PRs only
- [ ] After each promote that includes new `supabase/migrations/*`: run those files in SQL Editor on **sys**

**CI:** `.github/workflows/ci.yml` runs `npm test` on PRs into `dev` / `sys` / `main`. No auto-deploy.

---

## Phase 2 — Supabase projects (you)

| Project | Ref | Status |
|---------|-----|--------|
| timesense (dev) | `pwgspnqodaokmkoyghcu` | Live |
| timesense-sys | `uihapuiivlrpfxftyivo` | Live — **this is production**; confirm all migrations applied |

1. [ ] Settings → API: copy **Project URL** + **anon/publishable key**
2. [ ] Run `npm run db:migrate:prod` (or apply `supabase/migrations/*` in SQL Editor, in order, if not already applied) — never hand-edit schema
3. [ ] Auth providers + URL Configuration (per OAuth checklist)

Local env files (gitignored):

```
.env                 → optional fallback (Expo loads it always)
.env.development     → timesense (dev) — used by `npx expo start`
.env.staging         → optional local alias for sys/production (not auto-loaded)
```

**How local `npx expo start` picks env:**

1. **Native IDs / scheme** come from `APP_ENV` in `app.config.js` (default **`development`**). Override with e.g. `$env:APP_ENV='preview'; npx expo start` (PowerShell) for a sys/production-shaped config.
2. **Supabase URL/key** come from Expo's dotenv load of `.env` / `.env.development` (and `.env.local`).
3. EAS builds ignore local `.env*` for secrets — they use **EAS environment variables** (below). `APP_ENV` is set in `eas.json` per profile.

---

## Phase 3 — Repo config for multi-env builds (**done in repo**)

1. `app.config.js` — `APP_ENV` → display name, `ios.bundleIdentifier` / `android.package`, `scheme`, `extra.appEnv`; `preview` = production identity, `production` block dormant.
2. `eas.json` — `APP_ENV` on each profile; `developmentClient` + internal for dev; **`preview` now builds app-bundle** (Play Store requirement) with internal distribution.
3. `lib/oauth.ts` — redirect scheme from `Constants.expoConfig.scheme` (env-specific).
4. `.gitignore` already ignores `.env`, `.env.development`, `.env.staging`, `.env.production`, and `*.local` variants.

**EAS env vars (you — do not commit secrets):**

```bash
# development → timesense (dev)
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://pwgspnqodaokmkoyghcu.supabase.co --environment development --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <dev-anon-key> --environment development --visibility sensitive

# preview → timesense-sys (production)
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://uihapuiivlrpfxftyivo.supabase.co --environment preview --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <sys-anon-key> --environment preview --visibility sensitive
```

Dashboard alternative: [expo.dev](https://expo.dev) → `@raju003/timesense` → Environment variables.

---

## Phase 4 — First production build (you)

```bash
# Dev client (local day-to-day)
npx eas-cli build --profile development --platform android

# Ad-hoc sideload test build (sys identity/Supabase, installable APK, no Play Store)
npx eas-cli build --profile preview --platform android

# Play Store upload (sys identity/Supabase, app-bundle) — this is the `release` profile
npx eas-cli build --profile release --platform android
```

`preview` and `release` both run against **sys** Supabase / `com.timesense.sys` — they only
differ in output format (`apk` vs `app-bundle`) and distribution (`internal` vs `store`).
`preview` is for installing directly on a test device without going through Play; `release`
is the one that actually ships to Play Console, since Play requires an app-bundle for new
apps (an internal-testing-track APK upload is rejected).

- [ ] Complete first **development** build on a real device
- [ ] Complete a **preview** build, sideload it, confirm it talks only to **sys** Supabase
- [ ] Complete a **release** build — download the resulting `.aab` for upload to Play Console (Phase 5)

Credentials: EAS can generate an Android keystore — **download and back it up**; losing it blocks future Play Store updates.

---

## Phase 5 — Play Store distribution (you)

Google Play only for this release. iOS/App Store/TestFlight explicitly out of scope.

- [ ] Play Console → **Create app**
  - Package name: `com.timesense.sys` (matches the `preview` EAS profile — do not create it under `com.timesense`)
  - App name: `TimeSense`
- [ ] **Privacy policy URL** — required before any release; must be a public page describing what's collected (see below)
- [ ] **Data safety form** — declare what's collected/shared: account email (Supabase Auth), task/routine/timer data (Supabase Postgres), no ad/analytics SDKs unless added later
- [ ] **Store listing** — icon, feature graphic (1024×500), phone screenshots (min 2), short description (≤80 chars), full description
- [ ] **Content rating questionnaire**
- [ ] **App content** declarations (ads: no: target audience, etc.)
- [ ] Upload the `.aab` from the `release` EAS build to an **Internal testing** track first
- [ ] Test the internal build end-to-end on a real device, confirm it talks to sys Supabase
- [ ] Promote Internal → Closed/Open testing (optional) → **Production** track when confident
- [ ] First production rollout: consider a staged rollout percentage rather than 100% immediately

**Note:** package name is permanent once published — this locks in `com.timesense.sys` as the real production identity going forward.

---

## Phase 6 — Ops: keep-alive + backups — **DONE, verified 2026-08-22**

All repo secrets confirmed present; `keepalive-dev`/`keepalive-sys` running green on schedule,
`supabase-backup` has 10+ green scheduled runs landing objects in R2, and `restore-test.yml`
(decrypts latest R2 backup into a disposable Postgres container, never touches dev/sys) ran
successfully. Nothing left to do here — kept below for reference.

Free Supabase projects pause after ~7 days idle. **Sys now holds real user data — keep-alive is required, not optional.** Dev holds no real user data, but pausing still blocks local sign-in testing, so it gets a lighter-weight ping too.

**Option A — GitHub Actions** (in repo):

- `.github/workflows/keepalive-sys.yml` — pings `SUPABASE_SYS_URL` twice a week (Mon + Thu) with `SUPABASE_SYS_ANON_KEY`.
- `.github/workflows/keepalive-dev.yml` — pings `SUPABASE_DEV_URL` once a week (Mon) with `SUPABASE_DEV_ANON_KEY`.

Both curl REST `tasks?select=id&limit=1`; RLS keeps the response empty (`supabase/migrations/008_keepalive_grant.sql` grants anon SELECT for exactly this).

- [ ] Repo → Settings → Secrets → Actions: add `SUPABASE_SYS_URL` / `SUPABASE_SYS_ANON_KEY` and `SUPABASE_DEV_URL` / `SUPABASE_DEV_ANON_KEY`
- [ ] Confirm migration 008's `GRANT SELECT ON public.tasks TO anon` has been run against **both** the dev and sys projects
- [ ] Run each workflow once via **workflow_dispatch** to confirm it succeeds

**Option B — UptimeRobot** (no code): HTTP monitor every 5 min against the same REST URL + `apikey` header.

**Backups (sys):** automated — `.github/workflows/supabase-backup.yml` runs nightly, dumps sys,
encrypts with GPG, uploads to Cloudflare R2, prunes anything older than 30 days. One-time setup
(R2 bucket, GPG key, GitHub secrets) and the restore procedure are in [`../RUNBOOK.md`](../RUNBOOK.md).

- [ ] Complete the one-time setup in `RUNBOOK.md`
- [ ] Run the workflow once via **workflow_dispatch** and confirm an object lands in R2
- [ ] Test one restore against a throwaway local Postgres before relying on this
- [ ] Upgrade to Supabase Pro when: storage ~500MB, ~50K MAU, or a real backup/SLA incident — at
      that point Supabase's own PITR becomes the primary recovery path and this workflow can drop
      to a weekly cadence

---

## Database migrations

Every schema change is a committed file in [`supabase/migrations/`](../supabase/migrations/),
applied in numeric order. **Never hand-edit schema in the Supabase dashboard** — if a change
isn't in a migration file, it doesn't happen.

**Applying migrations:**

```bash
# One-time: set these locally (Project Settings → Database → Connection string, "Session" mode)
export SUPABASE_DEV_DB_URL="postgres://...pwgspnqodaokmkoyghcu..."
export SUPABASE_SYS_DB_URL="postgres://...uihapuiivlrpfxftyivo..."

npm run db:migrate:dev    # supabase db push against dev
npm run db:migrate:prod   # supabase db push against sys (production)
```

Falls back to pasting the same files into SQL Editor, in order, if a DB connection string isn't
available — but the script is the preferred path since it can't skip a file or apply them
out of order.

**Expand → migrate → contract, for anything that isn't purely additive:** the app update and the
DB migration don't land on every device at the same instant, so a breaking schema change ships
in stages, never in one migration:

1. Add the new column as **nullable** (or the new table, alongside the old one)
2. Ship an app version that writes to **both** old and new
3. Backfill old data into the new shape
4. Ship an app version that reads only from the new shape
5. Only then, in a **later** migration, drop the old column/table

`006_soft_delete_account.sql` → `010_routines_soft_delete.sql` follow this pattern (add nullable
`deleted_at`, ship reads/writes against it) as the reference example.

---

## Phase 7 — CI automation (later — after manual promotion works)

Do **not** automate until you have manually: merged `dev`→`sys`, pushed migrations to sys, built preview/production, QA'd, and shipped to Play internal testing.

Then add Actions roughly:

| Trigger | Job |
|---------|-----|
| Push `dev` | `npm test` |
| Push `sys` | `supabase db push` → sys, then `eas build --profile preview` |

Needs: `EXPO_TOKEN`, Supabase access tokens / DB passwords as GitHub secrets.

---

## Gap summary vs strategy spec

| Spec item | Repo / ops today |
|-----------|------------------|
| Branches `dev` / `sys` (`main` dormant) | Guide ready |
| Promotion docs + PR CI (test only) | `docs/GITHUB_PROMOTION.md` + `.github/workflows/ci.yml` |
| Supabase × 2 + identical migrations | Dev + sys live; no 3rd project needed under this plan |
| Distinct app IDs per env | **Done** in `app.config.js` |
| `app.config.js` + `APP_ENV` | **Done** — `preview` = production identity |
| `eas.json` env matrix | **Done** — `preview` now app-bundle for Play |
| EAS secrets per environment | Unverified — check `eas env:list` (Phase 3) |
| Keep-alive workflow | **Done** — `keepalive-dev.yml` / `keepalive-sys.yml`; confirm repo secrets are set |
| Manual `db dump` habit | **Done** — `supabase-backup.yml` (nightly, sys) + `restore-test.yml`; confirm one-time R2/GPG setup in RUNBOOK.md is complete |
| CI auto-promote/build | Missing (correct to wait) |
| Play Store listing | Missing — this doc's Phase 5 |
| `authenticated` table grants | **Done** — migration 011 applied to dev and sys (2026-08-22) |

---

## Suggested order this week

1. **Phase 1:** confirm `dev` / `sys` on GitHub; protect `sys`; read [GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md).
2. Confirm **sys** Supabase has every migration applied; finish OAuth for sys (Google redirect for `uihapuiivlrpfxftyivo`, publish consent screen).
3. Phase 0 accounts (Expo login, Google Play Console, Google Cloud OAuth).
4. Phase 3 remaining: Supabase redirect schemes + `eas env:create` for development/preview.
5. Phase 4: one development device build, then a `preview` (production) build.
6. Phase 6: sys keep-alive + first backup before real users sign up.
7. Phase 5: Play Store listing + internal testing track → production rollout.
8. Phase 7 last.
