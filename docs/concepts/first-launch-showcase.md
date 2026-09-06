# Daily Style Showcase — Feature Spec

> **Removed 2026-09-06.** This screen shipped and then was pulled entirely — `app/index.tsx`
> now redirects straight to Home on every open, no daily gate. `lib/showcaseGate.ts`,
> `app/showcase.tsx`, and `components/showcase/ShowcaseStyleIcon.tsx` were deleted. Kept here
> as historical reference in case a first-open/onboarding flow is wanted again later.

Source concept: `docs/concepts/first-launch-showcase.html`  
Related: `adhd-timer-app-spec.md` §3.0 + §8 (App Icon), `BUILD_SPEC.md` §3.0.

## Goal

On the **first open of each local calendar day**, show a short conveyor-belt of timer-style
icons so the person feels the app’s range before landing on Home. Skip is always available.

## Trigger

- Evaluate on cold start / first navigation after fonts load.
- Key: AsyncStorage `timesense.showcase.last_shown_date` = device-local `YYYY-MM-DD`.
- Show when missing or not equal to today.
- After finish or Skip → write today’s date, then go to Home (`/(tabs)`).
- **Not** forced to Sign Up every day (guest mode stays zero-friction).

## Motion

- One continuous horizontal pass (right → left), ~4.5s, constant speed.
- Caption + dots follow the icon nearest horizontal center.
- One pass only — no infinite loop.
- Reduced motion: static row of icons; Skip still works; short auto-advance hold.

## Order

1. Radial  
2. Slices  
3. Plant  
4. Moon  
5. Sky  
6. Garden  
7. Monk  
8. **Cat Loaf** (closing — **app icon**)

Sky / Garden may appear here as upcoming styles even if not yet selectable on New Timer.

## Cat Loaf tile (= app icon)

Matches Section 8 of the app spec:

| Part | Token |
|------|--------|
| Background | `--crust` |
| Loaf body | `--cream` |
| Ear shading | `--crust-dark` |
| Eyes | `--basil` |

## UI chrome

- Dark board background  
- TimeSense wordmark + tagline  
- Skip (top-right)  
- Caption title + one-line description + progress dots  
