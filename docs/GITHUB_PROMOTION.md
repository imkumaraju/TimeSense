# TimeSense — GitHub promotion pipeline

Manual promote via PRs. No environment skips. Code and DB migrations travel together.

## Environment map

| Git branch | Purpose | Supabase project | Project ref | EAS profile | App ID |
|------------|---------|------------------|-------------|-------------|--------|
| `dev` | Development | timesense (dev) | `pwgspnqodaokmkoyghcu` | `development` | `com.timesense.dev` |
| `sys` | **Production** (real users) | timesense-sys | `uihapuiivlrpfxftyivo` | `preview` | `com.timesense.sys` |
| `main` | *(dormant — future 3rd tier, not built or deployed)* | not created | TBD | `production` | `com.timesense` |

**Rule:** feature work lands in `dev` first → promote to `sys`. `sys` is the live production
pipeline's last stop. `main` is not part of the active flow — do not promote to it or build
from it until a real 3rd tier is deliberately introduced.

Related checklist: [DEPLOYMENT.md](./DEPLOYMENT.md) (OAuth, EAS, Play Store). App multi-env
wiring (`app.config.js` + `APP_ENV`) is in the repo; set EAS secrets and Supabase redirect
schemes before building.

---

## Branch purpose

| Branch | Who merges | What it means |
|--------|------------|----------------|
| `feature/*` (or `fix/*`) | Author via PR into `dev` | Day-to-day work. Branch off **`dev`**, not `sys`. |
| `dev` | You (or team) after review | Latest accepted development. Points at **dev** Supabase. |
| `sys` | You after QA-ready | **Production.** Points at **sys** Supabase — real user data. |
| `main` | — | Dormant. Not part of the live pipeline. |

---

## Normal feature PR (no DB change)

```text
feature/my-thing  →  PR →  dev  →  (later) PR →  sys
```

### Day-to-day

```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b feature/my-thing

# … commit work …

git push -u origin feature/my-thing
```

### Open PR into `dev` (GitHub UI)

1. github.com/imkumaraju/TimeSense → **Pull requests** → **New pull request**
2. **base:** `dev` ← **compare:** `feature/my-thing`
3. Title/body → **Create pull request**
4. Review → **Merge** (Squash or Merge commit — pick one style and stick to it)

Or with [GitHub CLI](https://cli.github.com/) (install once if `gh` is missing):

```bash
gh pr create --base dev --head feature/my-thing --title "…" --body "…"
gh pr merge --squash   # after review
```

### Promote `dev` → `sys` (production release)

**GitHub UI**

1. **New pull request**
2. **base:** `sys` ← **compare:** `dev`
3. Title e.g. `Promote: dev → sys (YYYY-MM-DD)`
4. Merge only after you intend to ship this to real users on **timesense-sys**

**CLI**

```bash
gh pr create --base sys --head dev --title "Promote: dev → sys" --body "Production promotion."
gh pr merge --merge   # or --squash; prefer merge commit for promotions so history is obvious
```

---

## Migration PR (code + SQL through the same pipeline)

Migrations live in `supabase/migrations/` (`001_…` … `007_…` today). They are **not** applied
by merging the PR alone — you apply SQL to the matching Supabase project after (or immediately
when) that env's branch receives the files.

### 1. Add migration on a feature branch

1. Add a new numbered file, e.g. `supabase/migrations/008_whatever.sql`
2. Prefer additive, idempotent SQL (`IF NOT EXISTS`, etc.) so re-runs in SQL Editor are safe
3. Open PR **into `dev`** (same as any feature)
4. Merge to `dev`

### 2. Apply on **dev** Supabase

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/pwgspnqodaokmkoyghcu/sql) for **timesense** (dev)
2. Paste **only the new** migration file(s) not yet run on that project
3. Run → confirm no errors
4. Smoke-test the app against dev

**Order:** merge PR to the env branch **first**, then run the new SQL on that env's project so
Git remains the source of truth for "what schema this env should have."

### 3. Promote to `sys` (PR `dev` → `sys`) — production release

1. Open/merge promote PR: base `sys` ← compare `dev`
2. Open SQL Editor for **timesense-sys**: [project `uihapuiivlrpfxftyivo`](https://supabase.com/dashboard/project/uihapuiivlrpfxftyivo/sql)
3. Run the **same new** migration file(s) that landed in that promote
4. QA in production (sys) — this is real user data, verify carefully before/after

### Checklist template (paste into promote PR body)

```markdown
## Promote (dev → sys, production)
- [ ] Source branch already includes intended commits
- [ ] New migration files in this promote (list): …
- [ ] After merge: run those files in SQL Editor on **timesense-sys**
- [ ] Smoke-tested sys (production) immediately after

## Do not
- Skip straight from `feature/*` to `sys`
- Hand-edit schema only in the Supabase dashboard without a repo migration file
```

### Optional later: Supabase CLI

There is no `supabase/config.toml` in the repo yet. When you want CLI instead of SQL Editor:

```bash
npx supabase login
npx supabase link --project-ref pwgspnqodaokmkoyghcu   # one env at a time
npx supabase db push
```

Until then, **SQL Editor + files in `supabase/migrations/`** is the supported path.

---

## Branch protection (do this in GitHub today)

Repo → **Settings** → **Branches** → **Add branch protection rule** (or **Rules** → rulesets).

### Recommended: `sys` (production)

- [ ] Require a pull request before merging
- [ ] Require approvals: **1** (even if only you — forces the PR habit)
- [ ] Do **not** allow force pushes
- [ ] Do **not** allow deletions
- [ ] Optionally: restrict who can push / merge to you only

### Recommended: `dev`

- Prefer require PR for team habits; solo you may allow direct push to `dev` temporarily.
- Still: **no force push** if others might use the branch.

### `main`

- Dormant. Branch protection optional — leave the same rules as `sys` if you want the door
  closed in case a real 3rd tier is stood up later; otherwise ignore.

### Rules of thumb

| Do | Don't |
|----|--------|
| PR into `dev`, then promote PR to `sys` | Push straight to `sys` |
| Put schema changes in `supabase/migrations/` | Change tables only in the Supabase Dashboard |
| Apply migration on the env that just received the merge | Run production SQL from a branch that never merged to `sys` |
| Promote `dev`→`sys` | PR `feature/*` → `sys` directly |

---

## First-time setup checklist (you)

`dev` and `sys` were created from the same commit as `main` and pushed to `origin` (no WIP
committed). Confirm in GitHub, then protect branches.

1. [ ] Confirm branches `dev`, `sys` exist under **Code** → branch dropdown
2. [ ] Add protection rules for `sys` (above)
3. [ ] Open a no-op or real promote later only when you have commits on `dev` ahead of `sys`
4. [ ] Confirm sys Supabase (production) has migrations `001`–`007` applied (same files as `supabase/migrations/`)

**Default branch:** keep **`sys`** as the branch you treat as production truth day-to-day for
ops purposes; GitHub's repo default branch setting can stay `main` or switch to `sys` — either
is fine since `main` isn't deployed from.

---

## CI (lightweight)

Workflow: `.github/workflows/ci.yml`

- Runs on pull requests targeting `dev`, `sys`, or `main`
- Runs `npm test` only (no auto-deploy, no `db push`)
- Promotion and migration apply stay **manual**

---

## What this pipeline does *not* do yet

- Auto-deploy EAS builds on merge
- Auto-apply Supabase migrations
- A real 3rd (`main`) environment — deferred, not currently planned

Those stay in [DEPLOYMENT.md](./DEPLOYMENT.md) Phases 3–7.
