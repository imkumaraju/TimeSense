# TimeSense — Deployment Action Checklist

Follows `deployment-strategy-spec.md`: three environments (**dev** / **sys** / **main**), each with its own Supabase project, EAS build profile, and app identifier.

Use this as the ordered to-do list. Checkboxes are for you (accounts, portals, secrets). Repo follow-ups are listed under each phase.

---

## Already in place

| Area | Status |
|------|--------|
| Expo app (SDK 54), Expo Router, TypeScript | Done |
| App name / slug `TimeSense` / `timesense` | Done (`app.json`) |
| Bundle / package IDs (env-specific) | **Decided** — not wired in repo yet (still `com.timesense.app` in `app.json`) |
| URL scheme `timesense` + path `/auth/callback` | Done (`app.json`, `lib/oauth.ts`) — shared scheme until `app.config.js` |
| `eas.json` profiles: `development`, `preview`, `production` | Partial — no per-env IDs / `APP_ENV` / store distribution flags |
| Migrations `001`–`004` in repo | Done — apply per env via SQL Editor (see promotion guide) |
| Local `.env` + `.env.example` (`EXPO_PUBLIC_SUPABASE_URL` + `KEY`/`ANON_KEY`) | Done |
| Social auth setup docs (`supabase/SETUP.txt`, `SOCIAL_AUTH_SETUP.txt`) | Done — update per env when creating sys/prod |
| GitHub remote `imkumaraju/TimeSense` | Done |
| Promotion guide (`docs/GITHUB_PROMOTION.md`) | Done |
| `dev` / `sys` / `main` branches on remote | Done (same tip as `main` at create time) |
| Lightweight PR CI (Jest on PRs to `dev`/`sys`/`main`) | In repo (`.github/workflows/ci.yml`) |
| EAS account login / linked Expo project / `extra.eas.projectId` | **Missing** |
| `app.config.js` (env-based name + bundle id) | **Missing** |
| Supabase projects | Dev + sys live; **prod** blocked by free-tier 2-project cap |
| GitHub Actions keep-alive | **Missing** (prod) |
| Store listings / TestFlight / Play tracks | **Missing** |
| README | **Missing** |

---

## Confirmed decision: bundle / package IDs

| Environment | Git branch | EAS profile | App ID (iOS + Android) | Display name (planned) | Supabase project | Project ref |
|-------------|------------|-------------|------------------------|------------------------|------------------|-------------|
| **Dev** | `dev` | `development` | `com.timesense.dev` | TimeSense Dev | timesense (dev) | `pwgspnqodaokmkoyghcu` |
| **Sys / staging** | `sys` | `preview` | `com.timesense.sys` | TimeSense Staging | timesense-sys | `uihapuiivlrpfxftyivo` |
| **Production** | `main` | `production` | `com.timesense` | TimeSense | timesense-prod *(future)* | TBD |

**Git promote flow (PRs only):** see **[GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md)** — `feature/*` → `dev` → `sys` → `main`, including how migrations travel with the same PRs.

**Migration from today:** repo and Apple docs still say `com.timesense.app`. Treat that as the old single-ID placeholder. Do **not** create new Apple/Google/store apps under `com.timesense.app`. When wiring `app.config.js`, replace it with the three IDs above. Update Apple Client IDs lists from `com.timesense.app` → the three new IDs (plus `host.exp.Exponent` for Expo Go).

**Deep link scheme (today vs later):**

| Today (code) | Planned with `app.config.js` (recommended for side-by-side installs) |
|--------------|----------------------------------------------------------------------|
| All builds: scheme `timesense` → `timesense://auth/callback` | Dev: `timesense-dev://auth/callback` · Sys: `timesense-sys://auth/callback` · Prod: `timesense://auth/callback` |

OAuth path is always `/auth/callback` (`lib/oauth.ts`, `app/auth/callback.tsx`). Expo Go still uses `exp://…/--/auth/callback` (custom schemes are not owned by Expo Go).

---

## Decisions still open (blocks later phases)

1. **~~Bundle / package IDs~~** — **Done** (matrix above).

2. **Supabase free tier × 3**  
   - Free org limit is **2 active projects**. Three isolated projects need one of:  
     - second Supabase org for the 3rd project, **or**  
     - one Pro project ($25/mo), **or**  
     - drop to two envs (dev + prod) for now.  
   Spec still recommends free + keep-alive; resolve the 3rd slot explicitly.

3. **~~Which existing project is which~~** — **Done**  
   - Dev: `pwgspnqodaokmkoyghcu` (timesense)  
   - Sys: `uihapuiivlrpfxftyivo` (timesense-sys)  
   - Prod: create when you have a 3rd slot; never point production builds at **dev** until sys QA passes.

4. **Env var naming**  
   - Spec: `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  
   - App reads: `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_KEY` (`lib/supabase.ts`)  
   - Either keep current names in EAS secrets, or add publishable-key support in code. Do not invent a third name.

---

## OAuth console checklist (you — do before multi-env app wiring)

How auth works today (`lib/oauth.ts`):

1. App calls Supabase `signInWithOAuth` with `redirectTo` = app deep link (`timesense://auth/callback` or `exp://…`).
2. Browser hits **Google** → Google redirects to **Supabase** `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase redirects to the app deep link with tokens.

So Google Console must authorize the **Supabase** callback URL (not the app scheme). Supabase must allow-list the **app** deep link.

### Recommendation: Google Cloud

**One Google Cloud project**, three **Web application** OAuth clients (dev / sys / prod).

| Why this | Why not the alternative |
|----------|-------------------------|
| Matches three Supabase projects; each gets its own Client ID + Secret | One Web client with three redirect URIs shares one secret across envs |
| Cheap / simple (no need for three Google Cloud *projects*) | Separate GCP projects add account clutter with no auth benefit for this app |

- Supabase Google provider uses the **Web** client ID + secret (browser OAuth).  
- **iOS / Android OAuth clients are optional** for the current Expo + Supabase browser flow. Add them later for native Google Sign-In / Play integrity — not required for Expo Go or `signInWithOAuth`.

### Google Cloud Console — exact steps

For **each** env (dev, sys, prod):

1. [ ] [console.cloud.google.com](https://console.cloud.google.com/) → same project → APIs & Services → Credentials  
2. [ ] Create **OAuth client ID** → Application type: **Web application**  
   - Name: e.g. `TimeSense Supabase Dev` / `… Sys` / `… Prod`  
3. [ ] **Authorized redirect URIs** — add **only** that env’s Supabase callback:

   | Env | Authorized redirect URI |
   |-----|-------------------------|
   | Dev (existing) | `https://pwgspnqodaokmkoyghcu.supabase.co/auth/v1/callback` |
   | Sys | `https://uihapuiivlrpfxftyivo.supabase.co/auth/v1/callback` |
   | Prod | `https://<prod-ref>.supabase.co/auth/v1/callback` |

4. [ ] Copy **Client ID** + **Client Secret** → paste into that env’s Supabase → Authentication → Providers → Google  
5. [ ] OAuth consent screen: External is fine for testing; add your Gmail as a test user while status is Testing  
6. [ ] **Authorized JavaScript origins** — usually leave empty for this mobile/Supabase flow (redirect URI is enough)

**Optional later (native / store Android):** create an **Android** OAuth client per package:

| Package | SHA-1 |
|---------|-------|
| `com.timesense.dev` | debug keystore and/or EAS credentials SHA-1 |
| `com.timesense.sys` | EAS preview keystore SHA-1 |
| `com.timesense` | EAS production / Play App Signing SHA-1 |

```bash
# Debug SHA-1 (Windows)
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Do **not** put Android client secrets into Supabase — keep using the **Web** client there.

**Optional iOS Google client:** only if you add native Google SDK later; bundle IDs = the three App IDs above. Not needed for current Supabase browser OAuth.

### Supabase — exact steps (per project: timesense-dev / sys / prod)

Do this on **each** project after it exists. Existing project `pwgspnqodaokmkoyghcu` = treat as **dev**.

#### 1. Schema (every project)

- [ ] SQL Editor — run in order (same files; **do not hand-edit schema**):  
  - `supabase/migrations/001_tasks.sql`  
  - `supabase/migrations/002_task_description.sql`  
  - `supabase/migrations/003_cost_strategy_schema.sql`  
  - `supabase/migrations/004_profile_names.sql`  
- [ ] Later changes: `supabase migration new …` → commit → `supabase db push` to the env matching the branch

#### 2. Auth → URL Configuration

| Field | Dev (today / until schemes split) | After `app.config.js` env schemes |
|-------|-----------------------------------|-----------------------------------|
| **Site URL** | `timesense://auth/callback` | Dev: `timesense-dev://auth/callback` · Sys: `timesense-sys://auth/callback` · Prod: `timesense://auth/callback` |
| **Redirect allow list** | see below | swap scheme prefix per env |

**Redirect URLs to add on every project (minimum, matches current code):**

```
timesense://auth/callback
timesense://**
exp://**
exp://127.0.0.1:8081/--/*
http://localhost:8081/**
```

**Also add when env-specific schemes land** (each project only needs its own + shared Expo Go entries):

```
timesense-dev://auth/callback    # timesense-dev project
timesense-dev://**
timesense-sys://auth/callback    # timesense-sys project
timesense-sys://**
timesense://auth/callback        # timesense-prod (same as Site URL)
timesense://**
```

If sign-in returns to the browser but not the app: Auth screen in `__DEV__` shows the live redirect URI — paste that **exact** string into Additional Redirect URLs.

#### 3. Auth → Providers → Google

- [ ] Enable Google  
- [ ] Client ID + Client Secret = the **Web** OAuth client for **this** env only  
- [ ] Save  

#### 4. Auth → Providers → Apple (same setup file; brief)

**Native iOS** (`expo-apple-authentication` / id token) — enable Apple; **Client IDs** (comma-separated) must include:

```
host.exp.Exponent,com.timesense.dev,com.timesense.sys,com.timesense
```

(Remove old `com.timesense.app` once you stop using that ID.)

- Expo Go testing: Secret Key can stay empty if you only use native Sign in with Apple on iOS.  
- App Store rule: if you offer Google on iOS, you must also offer Apple (already in app).

**Browser Apple OAuth** (Android / web — optional): Services ID Return URL =  
`https://<that-project-ref>.supabase.co/auth/v1/callback`  
(one Services ID config per Supabase project, or one Services ID with multiple return URLs).

#### 5. Differences between the three projects

| | Dev | Sys | Prod |
|---|-----|-----|------|
| Data | Disposable | QA only | Real users |
| Google Web client | Dev client | Sys client | Prod client |
| Site URL / redirects | Dev scheme (or shared `timesense` until split) | Sys scheme | Prod scheme |
| Apple Client IDs | Same list of three bundle IDs + Expo Go on all projects is fine | same | same |
| Keep-alive ping | Optional | Optional | **Required** on free tier |

Copy **Project URL** + **anon key** into `.env.*` / EAS env for that profile only.

---

## Order of operations (OAuth-safe)

Do this so Google/Supabase stay consistent and nothing breaks mid-cutover:

1. [ ] Resolve remaining Decisions (3rd Supabase slot, keep existing project as **dev**).  
2. [ ] Create **sys** + **prod** Supabase projects; run migrations `001`–`004` on each.  
3. [ ] Google Cloud: create three **Web** OAuth clients; add each project’s `…/auth/v1/callback` redirect URI.  
4. [ ] Supabase per project: URL Configuration (Site URL + redirects) → Google provider (that env’s Web client) → Apple Client IDs (new bundle IDs).  
5. [ ] Verify Google sign-in still works against **dev** (Expo Go + current `com.timesense.app` / `timesense://` is OK until repo wiring).  
6. [ ] **Then** ask for in-repo work: `app.config.js` + `eas.json` + EAS env vars (bundle IDs + optional scheme split).  
7. [ ] After app config ships: add env-specific deep links to Supabase redirect lists; update Apple Developer App IDs / capabilities for the three new bundle IDs.

**Do not** change Google redirect URIs away from Supabase callbacks. **Do not** point production EAS builds at the current (dev) Supabase project.

---

## Phase 0 — Accounts & subscriptions (you)

Do these before any store build or multi-env wiring.

- [ ] **Expo account** — [expo.dev](https://expo.dev) → sign up / confirm you can log in  
  ```bash
  npx eas-cli login
  npx eas-cli init          # link this repo; writes projectId into app config
  ```
- [ ] **Apple Developer Program** ($99/yr) — [developer.apple.com](https://developer.apple.com)  
  Required for TestFlight + App Store + Sign in with Apple (production).  
  Register App IDs: `com.timesense.dev`, `com.timesense.sys`, `com.timesense` (not `com.timesense.app`).
- [ ] **Google Play Console** ($25 one-time) — [play.google.com/console](https://play.google.com/console)
- [ ] **Google Cloud** OAuth — follow [OAuth console checklist](#oauth-console-checklist-you--do-before-multi-env-app-wiring) above.
- [ ] **Supabase account** — decide org strategy for the 3rd free project (see Decisions).
- [ ] **GitHub** — confirm you own `imkumaraju/TimeSense` and can add Actions secrets.

---

## Phase 1 — Git promotion branches

**Full guide:** [GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md) (`feature/*` → `dev` → `sys` → `main`, migration apply steps, branch protection, first-time checklist).

```bash
git fetch origin
git checkout main
git pull origin main
git branch dev
git branch sys
git push -u origin dev
git push -u origin sys
```

- [ ] Confirm `dev` / `sys` on remote (do **not** force-push; leave local WIP uncommitted if needed)  
- [ ] Branch protection on `main` and `sys`: require PR, no force push  
- [ ] Day-to-day: branch from `dev`, PR into `dev` first; promote with PRs only  
- [ ] After each promote that includes new `supabase/migrations/*`: run those files in SQL Editor on that env’s Supabase  

**CI:** `.github/workflows/ci.yml` runs `npm test` on PRs into `dev` / `sys` / `main`. No auto-deploy.

---

## Phase 2 — Supabase projects (you)

See [OAuth console checklist](#oauth-console-checklist-you--do-before-multi-env-app-wiring) for Auth URL + Google/Apple details. Schema promote steps: [GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md).

| Project | Ref | Status |
|---------|-----|--------|
| timesense (dev) | `pwgspnqodaokmkoyghcu` | Live — treat as **dev** |
| timesense-sys | `uihapuiivlrpfxftyivo` | Live — confirm migrations `001`–`004` applied |
| timesense-prod | TBD | Blocked until 3rd project slot |

For **sys** (and later **prod**):

1. [ ] Settings → API: copy **Project URL** + **anon/publishable key**  
2. [ ] Run migrations `001`–`004` in SQL Editor if not already applied (never hand-edit schema)  
3. [ ] Auth providers + URL Configuration (per OAuth checklist)  

**CLI (recommended):**

```bash
npx supabase login
npx supabase link --project-ref <dev-ref>    # link one at a time when pushing
npx supabase db push
```

There is no `supabase/config.toml` in the repo yet — `supabase init` / `link` will create it (safe to commit config; not secrets).

Local env files (gitignored):

```
.env.development   → timesense-dev
.env.staging       → timesense-sys
.env.production    → timesense-prod
```

Use the names `lib/supabase.ts` already understands (`EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_KEY` or `ANON_KEY`).

---

## Phase 3 — Repo config for multi-env builds (repo — after console work)

**Not implemented yet.** After you finish Supabase + Google Console steps, ask Cursor to:

1. Convert `app.json` → `app.config.js` that reads `APP_ENV` and sets:
   - display name: TimeSense Dev / Staging / TimeSense  
   - `ios.bundleIdentifier` / `android.package`: `com.timesense.dev` / `.sys` / `com.timesense`  
   - optional env-specific `scheme`: `timesense-dev` / `timesense-sys` / `timesense`  
2. Expand `eas.json` (`APP_ENV`, per-profile packages, `production.distribution: "store"`). Keep current Android `apk` (preview) / `app-bundle` (production).  
3. Add `expo-dev-client` for the `development` profile.  
4. Align `.gitignore` for `.env.development`, `.env.staging`, `.env.production`.  
5. Optional: `eas env:pull --environment development` for local dev.

**EAS env vars (you run after `eas login` + `eas init`):**  
Use current EAS env API (`eas secret:create` is deprecated):

```bash
# development → timesense-dev
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<dev-ref>.supabase.co --environment development --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <dev-key> --environment development --visibility sensitive

# preview → timesense-sys
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://uihapuiivlrpfxftyivo.supabase.co --environment preview --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <sys-key> --environment preview --visibility sensitive

# production → timesense-prod
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<prod-ref>.supabase.co --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_KEY --value <prod-key> --environment production --visibility sensitive
```

Also set `APP_ENV` per profile in `eas.json` (not secret).

---

## Phase 4 — First builds (you)

Install CLI once: `npm i -D eas-cli` or always `npx eas-cli`.

```bash
# Dev client (local day-to-day)
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios

# Staging / QA
npx eas-cli build --profile preview --platform all

# Production (only after sys QA)
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform ios
npx eas-cli submit --profile production --platform android
```

- [ ] Complete first **development** build on a real device (BUILD_SPEC milestone 13 — still open)  
- [ ] Confirm staging build talks only to **sys** Supabase  
- [ ] Confirm production build talks only to **prod** Supabase  

Credentials: first iOS build will prompt for Apple team / distribution certs (EAS can manage). Android: EAS can generate a keystore — **download and back it up**.

---

## Phase 5 — Store distribution (you)

### iOS

- [ ] App Store Connect → create app (bundle id = `com.timesense`)  
- [ ] Internal TestFlight for **sys** (`com.timesense.sys`) — separate App Store Connect app **or** Expo internal distribution until you want a second listing  
- [ ] Privacy nutrition labels, screenshots, description, support URL  
- [ ] Sign in with Apple capability on production (and sys/dev) App IDs  

### Android

- [ ] Play Console → create app (package = `com.timesense`)  
- [ ] Internal testing track for **sys** package `com.timesense.sys`  
- [ ] Store listing, content rating, privacy policy URL  
- [ ] Upload AAB from `production` profile  

**Note:** distinct package names = side-by-side install, but Google/Apple treat them as **separate apps**.

---

## Phase 6 — Ops: keep-alive + backups (you + small YAML)

Free projects pause after ~7 days idle. Protect **prod** at minimum.

**Option A — GitHub Actions** (in repo):

`.github/workflows/keepalive-prod.yml` — daily `curl` to REST `tasks?select=id&limit=1` with `apikey` from GitHub secret `SUPABASE_PROD_PUBLISHABLE_KEY`.

- [ ] Repo → Settings → Secrets → Actions: add prod (and optionally sys/dev) keys  
- [ ] Add workflow file(s); run once via **workflow_dispatch**  

**Option B — UptimeRobot** (no code): HTTP monitor every 5 min against the same REST URL + `apikey` header.

**Backups (prod):**

```bash
npx supabase db dump --project-ref <prod-ref> -f backups/prod-$(Get-Date -Format yyyyMMdd).sql
```

- [ ] Weekly dump to private storage (or private repo) until you pay for Pro automated backups  
- [ ] Upgrade to Pro when: storage ~500MB, ~50K MAU, or a real backup/SLA incident  

---

## Phase 7 — CI automation (later — after manual promotion works)

Do **not** automate until you have manually: merged `dev`→`sys`, pushed migrations to sys, built preview, QA’d, merged `sys`→`main`, pushed migrations to prod, built + submitted production.

Then add Actions roughly:

| Trigger | Job |
|---------|-----|
| Push `dev` | `npm test` (lint if added) |
| Push `sys` | `supabase db push` → sys, then `eas build --profile preview` |
| Push `main` | `supabase db push` → prod, then `eas build --profile production --auto-submit` |

Needs: `EXPO_TOKEN`, Supabase access tokens / DB passwords as GitHub secrets.

---

## Gap summary vs strategy spec

| Spec item | Repo / ops today |
|-----------|------------------|
| Branches `dev` / `sys` / `main` | Guide ready; push `dev`/`sys` if missing on remote |
| Promotion docs + PR CI (test only) | `docs/GITHUB_PROMOTION.md` + `.github/workflows/ci.yml` |
| Supabase × 3 + identical migrations | Dev + sys live; prod pending; migrations in repo |
| Distinct app IDs per env | **Decided**; repo still `com.timesense.app` until Phase 3 |
| `app.config.js` + `APP_ENV` | Missing |
| `eas.json` env matrix | Profiles exist; IDs/`APP_ENV`/store flags incomplete |
| EAS secrets per environment | Not configured; CLI not logged in |
| Keep-alive workflow | Missing |
| Manual `db dump` habit | Missing |
| CI auto-promote/build | Missing (correct to wait) |
| Free × 3 vs org 2-project cap | Prod blocked — choose workaround for 3rd slot |

---

## Suggested order this week

1. **Phase 1:** confirm `dev` / `sys` on GitHub; protect `main` + `sys`; read [GITHUB_PROMOTION.md](./GITHUB_PROMOTION.md).  
2. Confirm **sys** Supabase has migrations `001`–`004`; finish OAuth for sys (Google redirect for `uihapuiivlrpfxftyivo`).  
3. Resolve 3rd Supabase slot (prod) when needed — do not block Git promote on prod.  
4. Phase 0 accounts (Expo login + Apple/Google if targeting stores).  
5. Phase 3: `eas init`, env vars, then ask for `app.config.js` / `eas.json` update in-repo.  
6. Phase 4: one development device build.  
7. Phase 6: prod keep-alive before any real users.  
8. Phase 5 when product-ready; Phase 7 last.
