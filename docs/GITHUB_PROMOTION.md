# TimeSense — GitHub promotion pipeline

Manual promote via PRs. No environment skips. Code and DB migrations travel together.

## Environment map

| Git branch | Purpose | Supabase project | Project ref | EAS profile | App ID |
|------------|---------|------------------|-------------|-------------|--------|
| `dev` | Development | timesense (dev) | `pwgspnqodaokmkoyghcu` | `development` | `com.timesense.dev` |
| `sys` | Staging / QA | timesense-sys | `uihapuiivlrpfxftyivo` | `preview` | `com.timesense.sys` |
| `main` | Production | timesense-prod *(not created yet)* | TBD | `production` | `com.timesense` |

**Rule:** feature work lands in `dev` first → promote to `sys` → promote to `main`. Never open a PR that skips an env (e.g. `dev` → `main`).

Related checklist: [DEPLOYMENT.md](./DEPLOYMENT.md) (OAuth, EAS, stores). App multi-env wiring (`app.config.js` + `APP_ENV`) is in the repo; set EAS secrets and Supabase redirect schemes before building.

---

## Branch purpose

| Branch | Who merges | What it means |
|--------|------------|---------------|
| `feature/*` (or `fix/*`) | Author via PR into `dev` | Day-to-day work. Branch off **`dev`**, not `main`. |
| `dev` | You (or team) after review | Latest accepted development. Points at **dev** Supabase. |
| `sys` | You after QA-ready | Staging. Same commits as a slice of `dev`. Points at **sys** Supabase. |
| `main` | You after sys QA | Production. Only what already lived on `sys`. |

---

## Normal feature PR (no DB change)

```text
feature/my-thing  →  PR →  dev  →  (later) PR →  sys  →  (later) PR →  main
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

### Promote `dev` → `sys` (when ready for staging QA)

**GitHub UI**

1. **New pull request**
2. **base:** `sys` ← **compare:** `dev`
3. Title e.g. `Promote: dev → sys (YYYY-MM-DD)`
4. Merge only after you intend to QA that build against **timesense-sys**

**CLI**

```bash
gh pr create --base sys --head dev --title "Promote: dev → sys" --body "Staging promotion."
gh pr merge --merge   # or --squash; prefer merge commit for promotions so history is obvious
```

### Promote `sys` → `main` (production)

Same pattern: **base** `main` ← **compare** `sys`. Merge only after sys QA passes.

```bash
gh pr create --base main --head sys --title "Promote: sys → main" --body "Production promotion."
```

---

## Migration PR (code + SQL through the same pipeline)

Migrations live in `supabase/migrations/` (`001_…` … `004_…` today). They are **not** applied by merging the PR alone — you apply SQL to the matching Supabase project after (or immediately when) that env’s branch receives the files.

### 1. Add migration on a feature branch

1. Add a new numbered file, e.g. `supabase/migrations/005_whatever.sql`
2. Prefer additive, idempotent SQL (`IF NOT EXISTS`, etc.) so re-runs in SQL Editor are safe
3. Open PR **into `dev`** (same as any feature)
4. Merge to `dev`

### 2. Apply on **dev** Supabase

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/pwgspnqodaokmkoyghcu/sql) for **timesense** (dev)
2. Paste **only the new** migration file(s) not yet run on that project
3. Run → confirm no errors
4. Smoke-test the app against dev

**Order:** merge PR to the env branch **first**, then run the new SQL on that env’s project so Git remains the source of truth for “what schema this env should have.”

### 3. Promote to `sys` (PR `dev` → `sys`)

1. Open/merge promote PR: base `sys` ← compare `dev`
2. Open SQL Editor for **timesense-sys**: [project `uihapuiivlrpfxftyivo`](https://supabase.com/dashboard/project/uihapuiivlrpfxftyivo/sql)
3. Run the **same new** migration file(s) that landed in that promote
4. QA the staging app

### 4. Promote to `main` (PR `sys` → `main`) — when prod exists

1. Merge promote PR: base `main` ← compare `sys`
2. Run the same new migration(s) on **timesense-prod**
3. Then ship the production build

### Checklist template (paste into promote PR body)

```markdown
## Promote
- [ ] Source branch already includes intended commits
- [ ] New migration files in this promote (list): …
- [ ] After merge: run those files in SQL Editor on the **target** Supabase project
- [ ] Smoke-tested target env (or planned immediately after SQL)

## Do not
- Skip sys
- Hand-edit schema only in one dashboard without a repo migration file
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

### Recommended: `main`

- [ ] Require a pull request before merging
- [ ] Require approvals: **1** (even if only you — forces the PR habit)
- [ ] Do **not** allow force pushes
- [ ] Do **not** allow deletions
- [ ] Optionally: restrict who can push / merge to you only

### Recommended: `sys`

- Same as `main` (require PR, no force push). Staging should not accept direct pushes of hotfixes that never saw `dev`.

### Recommended: `dev`

- Prefer require PR for team habits; solo you may allow direct push to `dev` temporarily.
- Still: **no force push** if others might use the branch.

### Rules of thumb

| Do | Don’t |
|----|--------|
| PR into `dev`, then promote PRs | Push straight to `main` or `sys` |
| Put schema changes in `supabase/migrations/` | Change tables only in Supabase Dashboard |
| Apply migration on the env that just received the merge | Run prod SQL from a branch that never merged to `main` |
| Promote `dev`→`sys`→`main` | PR `feature/*` → `main` or `dev` → `main` |

---

## First-time setup checklist (you)

`dev` and `sys` were created from the same commit as `main` and pushed to `origin` (no WIP committed). Confirm in GitHub, then protect branches.

1. [ ] Confirm branches `dev`, `sys`, `main` exist under **Code** → branch dropdown  
2. [ ] Add protection rules for `main` and `sys` (above)  
3. [ ] Open a no-op or real promote later only when you have commits on `dev` ahead of `sys`  
4. [ ] Confirm sys Supabase has migrations `001`–`004` applied (same files as `supabase/migrations/`)  
5. [ ] When prod project exists: apply `001`–`004` there before first `sys`→`main` promote that needs DB  

**Default branch:** keep **`main`** as GitHub default (production). Day-to-day checkout is `dev`.

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
- Multi-env `app.config.js` / bundle ID switching in the app binary  

Those stay in [DEPLOYMENT.md](./DEPLOYMENT.md) Phases 3–7.
