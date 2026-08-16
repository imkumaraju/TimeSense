# TimeSense

An ADHD-friendly timer that helps you *feel* time passing (visual styles like Eating Pizza / Cat Loaf) and learn your own prediction vs. actual patterns — local-first, no AI judgment.

## Stack

React Native + Expo (SDK 54) + Expo Router + TypeScript · Zustand · expo-sqlite · Supabase Auth/Postgres · Jest

## Quick start

```bash
npm install
cp .env.example .env.development   # add your Supabase URL + anon/publishable key
npx expo start
```

| Script | Purpose |
|--------|---------|
| `npm start` / `npx expo start` | Dev server (Expo Go or dev client) |
| `npm test` | Jest unit tests |
| `npm run android` / `npm run ios` | Native run via Expo |
| `npm run db:migrate:dev` / `npm run db:migrate:prod` | Apply `supabase/migrations/*` to dev / sys — see [Database migrations](docs/DEPLOYMENT.md#database-migrations) |

### Environment

App IDs and URL schemes follow `APP_ENV` in [`app.config.js`](app.config.js):

| `APP_ENV` | Bundle / package | Scheme |
|-----------|------------------|--------|
| `development` (default) | `com.timesense.dev` | `timesense-dev` |
| `preview` | `com.timesense.sys` | `timesense-sys` |
| `production` | `com.timesense` | `timesense` |

Required public env vars (see [`.env.example`](.env.example)):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Guest / offline mode works without keys; cloud auth and sync need a configured Supabase project.

## Product notes

- **Local-first:** the timer UI reads/writes SQLite (or AsyncStorage in Expo Go/web). Supabase is backup/sync only.
- **Guest mode:** skip sign-in; data stays on device until you sign in and claim rows.
- **Insights:** computed on-device from local history (deterministic stats, not AI).
- **App icon:** interim Cat Loaf assets in `assets/images/` (cream loaf on crust orange). Replace with final marketing art before store launch.

## Docs

| Doc | What |
|-----|------|
| [`BUILD_SPEC.md`](BUILD_SPEC.md) | Product + tech source of truth |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Multi-env EAS / Supabase / store checklist |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Parked work (e.g. Sign in with Apple) |
| [`docs/GITHUB_PROMOTION.md`](docs/GITHUB_PROMOTION.md) | `dev` → `sys` → `main` promote flow |
| [`supabase/migrations/`](supabase/migrations/) | Schema history — apply via `npm run db:migrate:*`, never hand-edit (see [DEPLOYMENT.md](docs/DEPLOYMENT.md#database-migrations)) |
| [`RUNBOOK.md`](RUNBOOK.md) | Supabase backup pipeline setup + restore procedure |

## Next: production ops

After this product polish pass, follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for store/ops blockers: prod Supabase project, EAS env secrets, OAuth redirect allow lists, Apple Sign-In, TestFlight / Play tracks, and keep-alive.
