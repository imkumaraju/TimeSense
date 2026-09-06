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

## Screenshots — action needed
Four screenshots are referenced but not yet present on disk (paste-in-chat images aren't
something this workflow can write to a file directly — need the actual files saved here):

| Path | Should show |
|---|---|
| `assets/images/monk-timer.png` | Monk timer running, 00:47 remaining, Pause / +5 min / Finish |
| `assets/images/home.png` | Home screen: "Hey there, Raju", New Timer, today's routines, recent list |
| `assets/images/new-timer.png` | New timer form: Wash Dishes, 25 min, repeat days, style/category pickers |
| `assets/images/done.png` | Done screen: "Nice work!", actual duration, how-did-it-feel picker |

Until these are added, the `<img>` tags in `index.html` will show broken-image icons in
those two spots. Export at roughly 2–3× the CSS frame size (`phone-lg` 316×692,
`phone-sm`/`phone-md` ~244–268×534–586) for a sharp retina render.

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
