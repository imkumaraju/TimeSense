# TimeSense marketing website

Static single-page site (no framework — matches the simplicity of the previous hand-written
page). Deployed to GitHub Pages by `.github/workflows/deploy-website.yml` on every push to
`main` that touches `website/**` or `docs/legal/**` (also runnable manually via
`workflow_dispatch`).

## One-time repo setting needed
GitHub Pages must be switched to **"GitHub Actions"** as its source (Settings → Pages →
Build and deployment → Source), since this replaces whatever branch/folder served the old
`imkumaraju.github.io/TimeSense/` page. Not something this workflow can do on its own — it
needs the repo Settings UI (or `gh api` with an authenticated token).

## Screenshots
All 4 are in as of 2026-09-06.

| Path | Should show | Status |
|---|---|---|
| `assets/images/monk-timer.jpg` | Monk timer running, time remaining, Pause / +5 min / Finish | ✅ (captured 2026-09-06) |
| `assets/images/home.png` | Home screen: "Hey there, Raju", New Timer, today's routines, recent list | ✅ (captured 2026-08-29 — predates the streak-badge removal, so it still shows a streak badge the current app no longer has; re-capture from a current build when convenient) |
| `assets/images/new-timer.png` | New timer form: Wash Dishes, 25 min, repeat days, style/category pickers | ✅ (captured 2026-09-06) |
| `assets/images/done.png` | Done screen: "Nice work!", actual duration, how-did-it-feel picker | ✅ (captured 2026-09-06) |

Export at roughly 2–3× the CSS frame size (`phone-lg` 316×692, `phone-sm`/`phone-md`
~244–268×534–586) for a sharp retina render. For a photographic/illustrated screenshot (like
the Monk timer's background art), prefer JPEG over PNG — the raw screenshot compresses far
better than PNG's lossless format for this kind of content (4MB → ~120KB in this case, no
visible quality loss at display size). `npx sharp-cli -i in.png -o outdir -f jpeg -q 78 resize
640` works well for this without installing anything permanently.

Also worth knowing: these three screenshots were captured 2026-09-06, matching the app as of
that date — if the timer screen's visuals change again later, re-capture rather than assuming
these stay accurate indefinitely.

## Structure
- `index.html` — the page.
- `styles.css` — all styling (recreated from the design's inline styles as a real stylesheet).
- `assets/mark.svg` — nav mark / favicon, shared with the app icon (see
  `docs/concepts/` for the icon spec — kept in sync with `app-icon-ios.svg` /
  `app-icon-android.svg`, which live at the repo root as delivered).
- `legal/` — **not committed here**; the deploy workflow copies `docs/legal/privacy.html` and
  `docs/legal/terms.html` into it at build time so the footer's Privacy/Terms links resolve
  without duplicating those files.

## Local preview
Any static file server works, e.g.:
```bash
npx serve website
```
(Privacy/Terms links will 404 locally unless you also copy `docs/legal/*.html` into a
`website/legal/` folder first — the deploy workflow does this automatically in CI.)
